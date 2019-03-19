const objectPath = require('object-path'),
      request = require('request-promise-native'),
      vm = require('vm');

const configService = require('../config'),
      db = require('../db'),
      logger = require('../lib/logger');

const CONFIGURED_PUSHES = 'outbound';

const queuedDocuments = () =>
  db.medic.query('medic/outbound_queue', {include_docs: true})
    .then(results => results.rows.map(r => r.doc));

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
        throw Error(`Mapping error for ${conf.name}:${dest}: JS error on source document: ${doc._id}: ${err}`);
      }
    } else {
      srcValue = objectPath.get(doc, path);
    }

    if (required && !srcValue) {
      throw Error(`Mapping error for ${conf.name}:${dest}: no source present`);
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
    url: conf.destination.base_url + conf.destination.path,
    body: payload,
    json: true
  };

  const auth = () => {
    const authConf = conf.destination.auth;

    if (!authConf) {
      return Promise.resolve();
    }

    if (authConf.type === 'Basic') {
      sendOptions.auth = {
        username: authConf.username,
        password: authConf.password,
        sendImmediately: true
      };
      return Promise.resolve();
    }

    if (authConf.type === 'Muso') {
      const authOptions = {
        method: 'POST',
        form: {
          login: authConf.username,
          password: authConf.password
        },
        // TODO: I think Request adds this for us?
        // headers: {
        //   'Content-Type': 'multipart/form-data'
        // },
        url: conf.destination.base_url + authConf.path
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
    }
  };

  return auth().then(() => request(sendOptions));
};

// Collects pushes to attempt out of a document given a global config
const collect = (config, doc) => {
  return doc.outbound_queue.map(pushName => {
    return config.find(conf => conf.name === pushName);
  });
};

// Coordinates the attempted pushing of documents that need it
const execute = () => {
  return queuedDocuments()
  .then(docs => {
    const pushConfig = configService.get(CONFIGURED_PUSHES);
    // array of {doc, conf} to be processed
    const pushes = docs.reduce((pushes, doc) => {
      const pushesForDoc =
        module.exports._collect(pushConfig, doc).map(push => ({doc: doc, conf: push}));
      return pushes.concat(pushesForDoc);
    }, []);

    // Attempts each push one by one. Written to be simple not efficient.
    // There are lots of things we could do to make this faster / less fragile,
    // such as scoping pushes by domain, as well as writing out successes before
    // all pushes are complete
    // For now we presume we aren't going to get much traffic against this and
    // will probably only be doing one push per schedule call
    const dirtyDocs = {};
    return pushes.reduce(
      (p, {doc, conf}) => p.then(() => {
        const payload = module.exports._map(doc, conf);
        return module.exports._send(payload, conf)
          .then(() => {
            // Worked
            if (!dirtyDocs[doc._id]) {
              dirtyDocs[doc._id] = doc;
            }

            doc.outbound_queue.splice(conf.name, 1);
          })
          .catch(err => {
            // Failed
            logger.error(`Failed to push ${doc._id} to ${conf.name}: ${err.message}`);
            // Don't remove it from the queue so it will be tried again next time
          });
      }), Promise.resolve())
      .then(() => db.medic.bulkDocs(Object.values(dirtyDocs)));
  });
};

module.exports = {
  execute: cb => module.exports._execute().then(() => cb()).catch(cb),
  _execute: execute,
  _collect: collect,
  _map: map,
  _send: send
};
