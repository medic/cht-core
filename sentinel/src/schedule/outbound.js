const objectPath = require('object-path'),
      urlJoin = require('url-join'),
      request = require('request-promise-native'),
      vm = require('vm');

const configService = require('../config'),
      db = require('../db'),
      logger = require('../lib/logger'),
      lineage = require('@medic/lineage')(Promise, db.medic);

const CONFIGURED_PUSHES = 'outbound';

const arrayinate = object => Object.keys(object).map(k => {
  object[k].key = k;
  return object[k];
});

const credential = key =>
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

// Returns a list of tuples of [queueDoc, actualDoc]
const queued = () =>
  db.sentinel.allDocs({
    startkey: 'task:outbound:',
    endkey: 'task:outbound:\ufff0',
    include_docs: true
  })
  .then(results => {
    const queues = results.rows.map(r => r.doc);

    return db.medic.allDocs({
      keys: queues.map(q => q.doc_id),
      include_docs: true
    }).then(results => {
      const docs = results.rows.map(r => r.doc);
      return lineage.hydrateDocs(docs);
    }).then(docs => queues.map((q, idx) => [q, docs[idx]]));
  });

// Maps a source document to a destination format using the given push config
const map = (doc, conf) => {
  const srcParams = srcData => {
    if (typeof srcData === 'string') {
      return {
        path: srcData,
        required: true
      };
    } else {
      return {
        path: srcData.path,
        expr: srcData.expr,
        required: !srcData.optional
      };
    }
  };

  const toReturn = {};

  Object.keys(conf.mapping).forEach(dest => {
    const {
      path, expr, required
    } = srcParams(conf.mapping[dest]);

    let srcValue;

    if (expr) {
      try {
        srcValue = vm.runInNewContext(expr, {doc: doc});
      } catch (err) {
        throw Error(`Mapping error for ${conf.key}/${dest} JS error on source document: ${doc._id}: ${err}`);
      }
    } else {
      srcValue = objectPath.get({doc: doc}, path);
    }

    if (required && srcValue === undefined) {
      throw Error(`Mapping error for ${conf.key}/${dest}: cannot find ${path} on source document`);
    }

    if (srcValue) {
      objectPath.set(toReturn, dest, srcValue);
    }
  });

  return toReturn;
};

// Attempts to send a given payload using a given push config
const send = (payload, conf) => {
  const sendOptions = {
    method: 'POST',
    url: urlJoin(conf.destination.base_url, conf.destination.path),
    body: payload,
    json: true
  };

  const auth = () => {
    const authConf = conf.destination.auth;

    if (!authConf) {
      return Promise.resolve();
    }

    if (!authConf.type) {
      return Promise.reject(Error('No auth.type, either declare the type or omit the auth property'));
    }

    if (authConf.type.toLowerCase() === 'basic') {
      return credential(authConf['password_key'])
        .then(password => {
          sendOptions.auth = {
            username: authConf.username,
            password: password,
            sendImmediately: true
          };
        });
    }

    if (authConf.type.toLowerCase() === 'muso-sih') {
      return credential(authConf['password_key'])
        .then(password => {
          const authOptions = {
            method: 'POST',
            form: {
              login: authConf.username,
              password: password
            },
            url: urlJoin(conf.destination.base_url, authConf.path),
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

// Collects pushes to attempt out of the queue, given a global config
const collect = (config, queue) => {
  return queue.queue.map(pushName => {
    return config.find(conf => conf.key === pushName);
  });
};

// Coordinates the attempted pushing of documents that need it
const execute = () => {
  const pushConfig = arrayinate(configService.get(CONFIGURED_PUSHES) || {});
  if (!pushConfig.length) {
    return Promise.resolve();
  }

  return module.exports._queued()
  .then(queues => {
    // array of {doc, conf} to be processed
    const pushes = queues.reduce((pushes, [queue, doc]) => {
      const pushesForDoc =
        module.exports._collect(pushConfig, queue).map(conf => ({queue, doc, conf}));
      return pushes.concat(pushesForDoc);
    }, []);

    // Attempts each push one by one. Written to be simple not efficient.
    // There are lots of things we could do to make this faster / less fragile,
    // such as scoping pushes by domain, as well as writing out successes before
    // all pushes are complete
    // For now we presume we aren't going to get much traffic against this and
    // will probably only be doing one push per schedule call
    const dirtyQueues = {};
    return pushes.reduce(
      (p, {queue, doc, conf}) => p.then(() => {
        const payload = module.exports._map(doc, conf);
        return module.exports._send(payload, conf)
          .then(() => {
            logger.info(`Pushed ${doc._id} to ${conf.key}`);
            // Worked
            if (!dirtyQueues[queue._id]) {
              dirtyQueues[queue._id] = queue;
            }

            queue.queue.splice(conf.key, 1);
            if (queue.queue.length === 0) {
              // Done with this queue completely
              queue._deleted = true;
            }
          })
          .catch(err => {
            // Failed
            logger.error(`Failed to push ${doc._id} to ${conf.key}: ${err.message}`);
            logger.error(err);
            // TODO: add some kind of count or log to the task so we can more
            // easily see which ones aren't working
            // ... or is the date enough?


            // Don't remove it from the queue so it will be tried again next time
          });
      }), Promise.resolve())
      .then(() => db.sentinel.bulkDocs(Object.values(dirtyQueues)));
  });
};

module.exports = {
  execute: cb => module.exports._execute().then(() => cb()).catch(cb),
  _execute: execute,
  _queued: queued,
  _collect: collect,
  _map: map,
  _send: send
};
