const objectPath = require('object-path'),
      urlJoin = require('url-join'),
      request = require('request-promise-native'),
      vm = require('vm');

const configService = require('../config'),
      db = require('../db'),
      logger = require('../lib/logger'),
      lineage = require('@medic/lineage')(Promise, db.medic);

const CONFIGURED_PUSHES = 'outbound';

const fetchPassword = key =>
  request(`${db.serverUrl}/_node/${process.env.COUCH_NODE_NAME}/_config/medic-credentials/${key}`)
    // This API gives weird psuedo-JSON results:
    //   "password"\n
    // Should be just `password`
    .then(result => result.match(/^"(.+)"\n?$/)[1])
    .catch(err => {
      if (err.statusCode === 404) {
        logger.error(`CouchDB config key 'medic-credentials/${key}' has not been populated. See the Outbound documentation.`);
      }

      // Throw it regardless so the process gets halted, we just error above for higher specificity
      throw err;
    });

// Returns a list of tasks with their fully hydrated medic document
const queuedTasks = () =>
  db.sentinel.allDocs({
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
      const associatedDocs = results.rows.map(r => r.doc);
      return lineage.hydrateDocs(associatedDocs);
    }).then(associatedDocs => {
      // allDocs returns results in order, as does hydrateDocs, so we can just
      // combine them with the task docs above
      return outboundTaskDocs.map((t, idx) => ({
        taskDoc: t,
        medicDoc: associatedDocs[idx]
      }));
    });
  });

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
        throw Error(`Mapping error for '${key}/${dest}' JS error on source document: ${doc._id}: ${err}`);
      }
    } else {
      srcValue = objectPath.get({doc}, path);
    }

    if (required && srcValue === undefined) {
      const problem = expr ? 'expr evaluated to undefined' : `cannot find '${path}' on source document`;
      throw Error(`Mapping error for '${key}/${dest}': ${problem}`);
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
    method: 'POST',
    url: urlJoin(config.destination.base_url, config.destination.path),
    body: payload,
    json: true
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
            method: 'POST',
            form: {
              login: authConf.username,
              password: password
            },
            url: urlJoin(config.destination.base_url, authConf.path),
            json: true
          };

          return request(authOptions)
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

  return auth().then(() => request(sendOptions));
};

// Collects push configs to attempt out of the task's queue, given a global config
const getConfigurationsToPush = (config, taskDoc) => {
  return taskDoc.queue.map(pushName => ([pushName, config[pushName]]));
};

const singlePush = (taskDoc, medicDoc, config, key) => {
  const infodoc = configService.getTransitionsLib().infodoc;

  const payload = mapDocumentToPayload(medicDoc, config, key);
  return send(payload, config)
    .then(() => {
      // Worked, remove entry from queue and add link to info doc
      logger.info(`Pushed ${medicDoc._id} to ${key}`);

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
        })
        .then(() => infodoc.get({id: medicDoc._id, doc: medicDoc}))
        .then(info => {
          info.completed_tasks = info.completed_tasks || [];
          info.completed_tasks.push({
            type: 'outbound',
            name: key,
            timestamp: Date.now()
          });
          return db.sentinel.put(info);
        });
    })
    .catch(err => {
      // Failed
      logger.error(`Failed to push ${medicDoc._id} to ${key}: ${err.message}`);
      logger.error(err);

      // Don't remove the entry from the task's queue so it will be tried again next time
    });
};

// Coordinates the attempted pushing of documents that need it
const execute = () => {
  const configuredPushes = configService.get(CONFIGURED_PUSHES) || {};
  if (!Object.keys(configuredPushes).length) {
    return Promise.resolve();
  }

  return queuedTasks()
  .then(tasks => {
    const pushes = tasks.reduce((acc, {taskDoc, medicDoc}) => {
      const pushesForDoc =
        getConfigurationsToPush(configuredPushes, taskDoc)
          .map(([key, config]) => ({taskDoc, medicDoc, config, key}));

      return acc.concat(pushesForDoc);
    }, []);

    // Attempts each push one by one. Written to be simple not efficient.
    // There are lots of things we could do to make this faster / less fragile,
    // such as scoping pushes by domain, as well as writing out successes before
    // all pushes are complete
    // For now we presume we aren't going to get much traffic against this and
    // will probably only be doing one push per schedule call
    return pushes.reduce(
      (p, {taskDoc, medicDoc, config, key}) => p.then(singlePush(taskDoc, medicDoc, config, key)),
      Promise.resolve()
    );
  });
};

module.exports = {
  execute: cb => execute().then(() => cb()).catch(cb)
};
