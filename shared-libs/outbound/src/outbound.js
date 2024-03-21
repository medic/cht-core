/**
 * Outbound is a service that creates and sends REST requests to external services based on data
 * generated in our system, and configurations the define mappings, external service location and
 * authentication.
 *
 * See: https://docs.communityhealthtoolkit.org/apps/reference/app-settings/outbound/
 *
 * This library deals with the conversion of the record into a REST request, and sending it to its
 * destination. Background management of retries and so on is done in schedules, and the initial
 * requester of an outbound push is the outbound transition.
 */
const _ = require('lodash');
const crypto = require('crypto');
const objectPath = require('object-path');
const urlJoin = require('url-join');
const request = require('request-promise-native');
const vm = require('vm');

const secureSettings = require('@medic/settings');

const OUTBOUND_REQ_TIMEOUT = 10 * 1000;

// set by init()
let logger;

class OutboundError extends Error {}

const fetchPassword = key => {
  return secureSettings.getCredentials(key).then(password => {
    if (!password) {
      throw new OutboundError(
        `Credentials for '${key}' have not been configured. See the Outbound documentation.`
      );
    }
    return password;
  });
};

// Maps a source document to a destination format using the given push config
const mapDocumentToPayload = (doc, config, key) => {
  const normaliseSourceConfiguration = sourceConfiguration => {
    if (typeof sourceConfiguration === 'string') {
      return {
        path: sourceConfiguration,
        required: true
      };
    }

    return {
      path: sourceConfiguration.path,
      expr: sourceConfiguration.expr,
      required: !sourceConfiguration.optional
    };
  };

  const toReturn = {};

  // Mappings (conf.mapping) are key value pairs where the key is an object path string defining the
  // resulting destination, and the value is either an object path string defining the source path, or
  // an object with more in-depth config on how to map the value.
  Object.keys(config.mapping).forEach(dest => {
    const {
      path, expr, required
    } = normaliseSourceConfiguration(config.mapping[dest]);

    let srcValue;

    if (expr) {
      try {
        srcValue = vm.runInNewContext(expr, {doc});
      } catch (err) {
        throw new OutboundError(`Mapping error for '${key}/${dest}' JS error on source document: '${doc._id}': ${err}`);
      }
    } else {
      try {
        srcValue = objectPath.get({doc}, path);
      } catch (err) {
        throw new OutboundError(`Mapping error for '${key}/${dest}' JS error on source document: '${doc._id}': ${err}`);
      }
    }

    if (required && srcValue === undefined) {
      const problem = expr ? 'expr evaluated to undefined' : `cannot find '${path}' on source document`;
      throw new OutboundError(`Mapping error for '${key}/${dest}' on source document '${doc._id}': ${problem}`);
    }

    if (srcValue !== undefined) {
      objectPath.set(toReturn, dest, srcValue);
    }
  });

  return toReturn;
};

// Attempts to send a given payload using a given push config
const sendPayload = (payload, config) => {
  const sendOptions = {
    url: urlJoin(config.destination.base_url, config.destination.path),
    body: payload,
    json: true,
    timeout: OUTBOUND_REQ_TIMEOUT
  };

  const auth = () => {
    const authConf = config.destination.auth;

    if (!authConf) {
      return Promise.resolve();
    }

    if (!authConf.type) {
      return Promise.reject(new OutboundError('No auth.type, either declare the type or omit the auth property'));
    }

    if (authConf.type.toLowerCase() === 'basic') {
      return fetchPassword(authConf.password_key)
        .then(password => {
          sendOptions.auth = {
            username: authConf.username,
            password: password,
            sendImmediately: true
          };
        });
    }

    if (authConf.type.toLowerCase() === 'header') {
      if (authConf.name && authConf.name.toLowerCase() === 'authorization') {
        return fetchPassword(authConf.value_key)
          .then(value => {
            sendOptions.headers = {
              Authorization: value
            };
          });
      }
      logger.error(`Unsupported header name '${authConf.name}'. Supported: Authorization`);
      throw new OutboundError(`Unsupported header name '${authConf.name}'. Supported: Authorization`);
    }

    if (authConf.type.toLowerCase() === 'muso-sih') {
      return fetchPassword(authConf.password_key)
        .then(password => {
          const authOptions = {
            form: {
              login: authConf.username,
              password: password
            },
            url: urlJoin(config.destination.base_url, authConf.path),
            json: true,
            timeout: OUTBOUND_REQ_TIMEOUT
          };

          return request.post(authOptions)
            .then(result => {
              // No that's not a spelling mistake, this API is sometimes French!
              if (result.statut !== 200) {
                logger.error('Non-200 status from Muso auth: %o', result);
                throw new OutboundError(`Got ${result.statut} when requesting auth`);
              }

              sendOptions.qs = {
                token: result.data.username_token
              };
            });
        });
    }

    // Misconfigured auth type
    return Promise.reject(new OutboundError(`Invalid auth type '${authConf.type}'. Supported: basic, muso-sih`));
  };

  return auth().then(() => {
    if (logger.isDebugEnabled()) {
      logger.debug('About to send outbound request');
      const clone = JSON.parse(JSON.stringify(sendOptions));
      if (clone.auth && clone.auth.password) {
        // mask password before logging
        clone.auth.password = '*****';
      }
      logger.debug(JSON.stringify(clone, null, 2));
    }

    return request.post(sendOptions)
      .then(result => {
        if (logger.isDebugEnabled()) {
          logger.debug('result from outbound request');
          logger.debug(JSON.stringify(result, null, 2));
        }
      });
  });
};

const orderedStringify = thing => {
  if (Object.prototype.toString.call(thing) === '[object Object]') {
    const output = [];

    const keys = Object.keys(thing).sort();
    for (const k of keys) {
      output.push(`"${k}":${orderedStringify(thing[k])}`);
    }

    return `{${output.join(',')}}`;
  }

  return JSON.stringify(thing);
};

// Never change this hashing algorithm or how we stringify, otherwise you will invalidate all existing hashes
const hash = payload => {
  // Sanitise the passed payload by running it through stringify logic as described here:
  //   https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#Description
  // So we don't have to care about this in our orderedStringify later
  const sanitisedJson = JSON.parse(JSON.stringify(payload));

  // Stringify it again, but this time with consistent key ordering.
  const consistentJsonString = orderedStringify(sanitisedJson);

  return crypto.createHash('sha256').update(consistentJsonString).digest('hex');
};

const updateInfo = (payload, recordInfo, configName) => {
  const hashedPayload = hash(payload);

  recordInfo.completed_tasks = recordInfo.completed_tasks || [];
  recordInfo.completed_tasks.push({
    type: 'outbound',
    name: configName,
    timestamp: Date.now(),
    hash: hashedPayload
  });
};

/**
 * Attempts to usefully parse the error so we can log it appropriately
 */
const logSendError = (configName, recordId, error) => {
  if (error.constructor.name === 'StatusCodeError') {
    const {statusCode, body} = error.response;

    // We got back something from the server but it's not a 2xx
    logger.error(`Failed to push ${recordId} to ${configName}, server responsed with ${statusCode}`);

    let loggableBody;
    try {
      loggableBody = JSON.stringify(body);
    } catch (e) {
      if (body && body.length > 100) {
        loggableBody = `${body.substring(0, 100)}...`;
      } else {
        loggableBody = body;
      }
    }
    logger.error(`Response body: ${loggableBody}`);
  } else if (error.constructor.name === 'RequestError') {
    // The url was malformed, the server doesn't exist at all, etc
    logger.error(`Failed to push ${recordId} to ${configName}: ${error.message}`);
  } else if (error.constructor.name === 'OutboundError') {
    // One of our generated ones, given message should be fine
    logger.error(`Failed to push ${recordId} to ${configName}: ${error.message}`);
  } else {
    // Unsure, include the entire error including stack etc
    logger.error(`Failed to push ${recordId} to ${configName}: %o`, error);
  }
};

/**
 * Returns a boolean indicating if this combination of config and record has already been sent.
 *
 * @param      {<object>}  payload     The payload that would be sent
 * @param      {<string>}  configName  key used for this config in our app-settings (for logging)
 * @param      {<object>}  recordInfo  the couchdb record's info doc
 * @return     {<boolean>}  whether we think it's been sent out before
 */
const alreadySent = (payload, configName, recordInfo) => {
  if (!recordInfo.completed_tasks) {
    return false;
  }

  const lastTask = _.findLast(recordInfo.completed_tasks, t => t.type === 'outbound' && t.name === configName);

  return lastTask && lastTask.hash && lastTask.hash === hash(payload);
};

module.exports = theLogger => {
  logger = theLogger;

  return {
    /**
     * Given a record and an outbound configuration, attempt to convert and deliver that payload.
     * Writes the success into the infodoc, but expects you to write it to CouchDB
     *
     * @param      {<object>}  config      a single outbound configuration
     * @param      {<string>}  configName  key used for this config in our app-settings (for logging)
     * @param      {<object>}  record      the couchdb record (ie report) to use
     * @param      {<object>}  recordInfo  the couchdb record's info doc
     * @return     {<promise>} a promise which can:
     *      - resolve with true: outbound was successful and sent
     *      - resolve with false: outbound didn't error, but wasn't sent out (because it's a duplicate of prior send)
     *      - reject with error: something went wrong
     */
    send: (config, configName, record, recordInfo) => {
      return Promise.resolve()
        .then(() => mapDocumentToPayload(record, config, configName))
        .then(payload => {
          if (alreadySent(payload, configName, recordInfo)) {
            logger.info(`Not pushing ${record._id} to ${configName} as payload is identical to previous push`);
            return false;
          }

          return sendPayload(payload, config)
            .then(() => updateInfo(payload, recordInfo, configName))
            .then(() => logger.info(`Pushed ${record._id} to ${configName}`))
            .then(() => true);
        })
        .catch(err => {
          logSendError(configName, record._id, err);
          throw err;
        });
    },
  };
};
