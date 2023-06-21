const PouchDB = require('pouchdb-core');
const logger = require('./logger');
const environment = require('./environment');
const rpn = require('request-promise-native');
PouchDB.plugin(require('pouchdb-adapter-http'));
PouchDB.plugin(require('pouchdb-find'));
PouchDB.plugin(require('pouchdb-mapreduce'));

const { UNIT_TEST_ENV } = process.env;

if (UNIT_TEST_ENV) {
  const DBS_TO_STUB = [
    'medic',
    'users',
    'medicUsersMeta',
    'sentinel',
    'medicLogs'
  ];
  const DB_FUNCTIONS_TO_STUB = [
    'allDocs',
    'bulkDocs',
    'bulkGet',
    'put',
    'post',
    'query',
    'get',
    'getAttachment',
    'changes',
    'info',
    'close'
  ];
  const GLOBAL_FUNCTIONS_TO_STUB = [
    'get',
    'exists',
    'close',
    'allDbs',
  ];

  const notStubbed = (first, second) => {
    const name = second ? `${first}.${second}` : first;
    logger.error(new Error(
      `${name}() not stubbed!  UNIT_TEST_ENV=${UNIT_TEST_ENV}. ` +
      `Please stub PouchDB functions that will be interacted with in unit tests.`
    ));
    process.exit(1);
  };

  DBS_TO_STUB.forEach(db => {
    module.exports[db] = {};
    DB_FUNCTIONS_TO_STUB.forEach(fn => {
      module.exports[db][fn] = () => notStubbed(db, fn);
    });
  });

  GLOBAL_FUNCTIONS_TO_STUB.forEach(fn => {
    module.exports[fn] = () => notStubbed(fn);
  });
} else {
  const fetch = (url, opts) => {
    // Adding audit flag (haproxy) Service that made the request initially.
    opts.headers.set('X-Medic-Service', 'api');
    return PouchDB.fetch(url, opts);
  };

  const DB = new PouchDB(environment.couchUrl, { fetch });
  const getDbUrl = name => `${environment.serverUrl}/${name}`;

  DB.setMaxListeners(0);
  module.exports.medic = DB;
  module.exports.medicUsersMeta = new PouchDB(`${environment.couchUrl}-users-meta`, { fetch });
  module.exports.medicLogs = new PouchDB(`${environment.couchUrl}-logs`, { fetch });
  module.exports.sentinel = new PouchDB(`${environment.couchUrl}-sentinel`, { fetch });
  module.exports.users = new PouchDB(getDbUrl('/_users'));
  module.exports.queryMedic = (viewPath, queryParams, body) => {
    const [ddoc, view] = viewPath.split('/');
    const url = ddoc === 'allDocs' ?
      `${environment.couchUrl}/_all_docs` :
      `${environment.couchUrl}/_design/${ddoc}/_view/${view}`;
    const requestFn = body ? rpn.post : rpn.get;
    return requestFn({
      url,
      qs: queryParams,
      json: true,
      body,
    });
  };

  // Get the DB with the given name
  module.exports.get = name => new PouchDB(getDbUrl(name));
  module.exports.close = db => {
    if (!db || db._destroyed || db._closed) {
      return;
    }

    try {
      db.close();
    } catch (err) {
      logger.error('Error when closing db: %o', err);
    }
  };

  // Resolves with the PouchDB object if the DB with the given name exists
  module.exports.exists = name => {
    const db = new PouchDB(getDbUrl(name), { skip_setup: true });
    return db.info()
      .then(result => {
        // In at least PouchDB 7.0.0, info() on a non-existent db doesn't throw,
        // instead it returns the error structure
        return  !result.error ? db : false;
      })
      .catch(() => false);
  };

  module.exports.allDbs = () => rpn.get({ uri: `${environment.serverUrl}/_all_dbs`, json: true });
}
