const objectPath = require('object-path');
const urlJoin = require('url-join');
const request = require('request-promise-native');
const vm = require('vm');

const secureSettings = require('@medic/settings');

const configService = require('../config');
const db = require('../db');
const logger = require('../lib/logger');
const lineage = require('@medic/lineage')(Promise, db.medic);

const CONFIGURED_PUSHES = 'outbound';
const OUTBOUND_REQ_TIMEOUT = 10 * 1000;

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

// Returns an object containing:
//   validTasks: an array of tasks and their hydrated docs as {task doc} objects
//   invalidTasks: an array of tasks whose documents have been deleted
const queuedTasks = () => {
  return db.sentinel.allDocs({
    startkey: 'task:outbound:',
    endkey: 'task:outbound:\ufff0',
    include_docs: true
  })
    .then(results => {
      const outboundTaskDocs = results.rows.map(r => r.doc);
      const associatedDocIds = outboundTaskDocs.map(q => q.doc_id);

      return db.medic.allDocs({
        keys: associatedDocIds,
        include_docs: true
      }).then(results => {
        const { validTasks, invalidTasks } = results.rows.reduce((acc, r, idx) => {
          const task = outboundTaskDocs[idx];
          if (r.doc) {
            acc.validTasks.push({
              task: task,
              doc: r.doc
            });
          } else if (r.error === 'not_found' || (r.value && r.value.deleted)) {
            acc.invalidTasks.push({
              task: task,
              row: r
            });
          } else {
            throw Error(`Unexpected error retrieving a document: ${JSON.stringify(r)}`);
          }

          return acc;
        }, {validTasks: [], invalidTasks: []});

        if (validTasks.length) {
          return lineage.hydrateDocs(validTasks.map(t => t.doc))
            .then(hydratedDocs => {
              validTasks.forEach((t, idx) => {
                t.doc = hydratedDocs[idx];
              });

              return { validTasks, invalidTasks };
            });
        } else {
          return { validTasks, invalidTasks };
        }
      });
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
const send = (payload, config) => {
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

// Collects push configs to attempt out of the task's queue, given a global config
const getConfigurationsToPush = (config, taskDoc) => {
  return taskDoc.queue.map(pushName => ([pushName, config[pushName]]));
};

// Remove the push task from the task's queue
const removeConfigKeyFromTask = (taskDoc, key) => {
  taskDoc.queue.splice(key, 1);
  if (taskDoc.queue.length === 0) {
    // Done with this queue completely
    taskDoc._deleted = true;
  }

  return db.sentinel.put(taskDoc)
    .then(({rev}) => {
      // This works because we are running a single push one at a time and we're passing a
      // shared reference around (so the next singlePush to run against the same task will have
      // a reference to this same doc with the updated rev). If we refactor this code to be more
      // efficient we need to be careful to not cause conflicts against the task document.
      taskDoc._rev = rev;
    });
};

// Log a successful push to the info doc
const logIntoInfoDoc = (medicDocId, key) => {
  return db.sentinel.get(`${medicDocId}-info`)
    .then(info => {
      info.completed_tasks = info.completed_tasks || [];
      info.completed_tasks.push({
        type: 'outbound',
        name: key,
        timestamp: Date.now()
      });
      return db.sentinel.put(info);
    });
};

const singlePush = (taskDoc, medicDoc, config, key) => Promise.resolve()
  .then(() => {
    if (!config) {
      // The outbound config entry has been deleted / renamed / something!
      logger.warn(
        `Unable to push ${medicDoc._id} for ${key} because this outbound config no longer exists, clearing task`
      );
      return removeConfigKeyFromTask(taskDoc, key);
    }

    const payload = mapDocumentToPayload(medicDoc, config, key);
    return send(payload, config)
      .then(() => {
        // Worked, remove entry from queue and add link to info doc
        logger.info(`Pushed ${medicDoc._id} to ${key}`);

        return removeConfigKeyFromTask(taskDoc, key)
          .then(() => logIntoInfoDoc(medicDoc._id, key));
      });
  }).catch(err => {
    // Failed
    logger.error(`Failed to push ${medicDoc._id} to ${key}: %o`, err);

    // Don't remove the entry from the task's queue so it will be tried again next time
  });

const removeInvalidTasks = invalidTasks => {
  if (invalidTasks.length) {
    logger.warn(`Found ${invalidTasks.length} tasks that could not have their associated records loaded:`);

    const toDelete = [];

    invalidTasks.forEach(({task, row}) => {
      logger.warn(`Task ${task._id} failed to load ${task.doc_id} because:`);
      logger.warn(JSON.stringify(row, null, 2));

      task._deleted = true;
      toDelete.push(task);
    });

    logger.warn('Deleting invalid tasks');

    return db.sentinel.bulkDocs(toDelete);
  } else {
    return Promise.resolve();
  }
};

// Coordinates the attempted pushing of documents that need it
const execute = () => {
  const configuredPushes = configService.get(CONFIGURED_PUSHES) || {};
  if (!Object.keys(configuredPushes).length) {
    return Promise.resolve();
  }

  return queuedTasks()
    .then(({validTasks, invalidTasks}) => {
      return removeInvalidTasks(invalidTasks)
        .then(() => {
          const pushes = validTasks.reduce((acc, {task, doc}) => {
            const pushesForDoc =
            getConfigurationsToPush(configuredPushes, task)
              .map(([key, config]) => ({task, doc, config, key}));

            return acc.concat(pushesForDoc);
          }, []);

          // Attempts each push one by one. Written to be simple not efficient.
          // There are lots of things we could do to make this faster / less fragile,
          // such as scoping pushes by domain, as well as writing out successes before
          // all pushes are complete
          // For now we presume we aren't going to get much traffic against this and
          // will probably only be doing one push per schedule call
          return pushes.reduce(
            (p, {task, doc, config, key}) => p.then(() => singlePush(task, doc, config, key)),
            Promise.resolve()
          );
        });
    });
};

module.exports = {
  execute: cb => execute().then(() => cb()).catch(cb)
};
