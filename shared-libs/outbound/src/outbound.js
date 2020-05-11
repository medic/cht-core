/**
 * Outbound is a service that creates and sends REST requests to external services based on data
 * generated in our system, and configurations the define mappings, external service location and
 * authentication.
 *
 * See: https://github.com/medic/medic-docs/blob/master/configuration/outbound.md
 *
 * This library deals with the conversion of the record into a REST request, and sending it to its
 * destination. Background management of retries and so on is done in schedules, and the initial
 * requester of an outbound push is the outbound transition.
 */
const objectPath = require('object-path');
const urlJoin = require('url-join');
const request = require('request-promise-native');
const vm = require('vm');

const secureSettings = require('@medic/settings');

const OUTBOUND_REQ_TIMEOUT = 10 * 1000;

// set by init()
let logger;

const fetchPassword = key => {
  return secureSettings.getCredentials(key).then(password => {
    if (!password) {
      throw new Error(
        `CouchDB config key 'medic-credentials/${key}' has not been populated. See the Outbound documentation.`
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
        throw Error(`Mapping error for '${key}/${dest}' JS error on source document: '${doc._id}': ${err}`);
      }
    } else {
      srcValue = objectPath.get({doc}, path);
    }

    if (required && srcValue === undefined) {
      const problem = expr ? 'expr evaluated to undefined' : `cannot find '${path}' on source document`;
      throw Error(`Mapping error for '${key}/${dest}' on source document '${doc._id}': ${problem}`);
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
      return Promise.reject(Error('No auth.type, either declare the type or omit the auth property'));
    }

    if (authConf.type.toLowerCase() === 'basic') {
      return fetchPassword(authConf['password_key'])
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
        return fetchPassword(authConf['value_key'])
          .then(value => {
            sendOptions.headers = {
              Authorization: value
            };
          });
      } else {
        logger.error(`Unsupported header name '${authConf.name}'. Supported: Authorization`);
        throw new Error(`Unsupported header name '${authConf.name}'. Supported: Authorization`);
      }
    }

    if (authConf.type.toLowerCase() === 'muso-sih') {
      return fetchPassword(authConf['password_key'])
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
                logger.error('Non-200 status from Muso auth', result);
                throw new Error(`Got ${result.statut} when requesting auth`);
              }

              sendOptions.qs = {
                token: result.data.username_token
              };
            });
        });
    }

    // Misconfigured auth type
    return Promise.reject(new Error(`Invalid auth type '${authConf.type}'. Supported: basic, muso-sih`));
  };

  return auth().then(() => {
    if (logger.isDebugEnabled()) {
      logger.debug('About to send outbound request');
      logger.debug(JSON.stringify(sendOptions, null, 2));
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

const updateInfo = (recordInfo, configName) => {
  recordInfo.completed_tasks = recordInfo.completed_tasks || [];
  recordInfo.completed_tasks.push({
    type: 'outbound',
    name: configName,
    timestamp: Date.now()
  });
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
     * @return     {<promise>} a promise which is successful if the record was converted and send
     *                         successfully. Can definitely fail.
     */
    send: (config, configName, record, recordInfo) => {
      return Promise.resolve()
        .then(() => mapDocumentToPayload(record, config, configName))
        .then(payload => sendPayload(payload, config))
        .then(() => updateInfo(recordInfo, configName))
        .then(() => logger.info(`Pushed ${record._id} to ${configName}`))
        .catch(err => {
          logger.error(`Failed to push ${record._id} to ${configName}: %o`, err);
          throw err;
        });
    }
  };
};
