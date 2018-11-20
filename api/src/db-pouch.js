const PouchDB = require('pouchdb-core'),
  logger = require('./logger'),
  environment = require('./environment');
PouchDB.plugin(require('pouchdb-adapter-http'));
PouchDB.plugin(require('pouchdb-find'));
PouchDB.plugin(require('pouchdb-mapreduce'));

const { UNIT_TEST_ENV } = process.env;

if (UNIT_TEST_ENV) {
  const DBS_TO_STUB = [
    'medic',
    'users'
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
  ];

  DBS_TO_STUB.forEach(db => {
    module.exports[db] = {};
    DB_FUNCTIONS_TO_STUB.forEach(fn => {
      module.exports[db][fn] = () => {
        logger.error(new Error(`${db}.${fn}() not stubbed!  UNIT_TEST_ENV=${UNIT_TEST_ENV}.  Please stub PouchDB functions that will be interacted with in unit tests.`));
        process.exit(1);
      };
    });
  });
} else {
  const DB = new PouchDB(environment.couchUrl, {
    fetch: (url, opts) => {
      opts.headers.set('X-Medic-Service', 'api');
      return PouchDB.fetch(url, opts);
    },
  });
  DB.setMaxListeners(0);
  module.exports.medic = DB;
  module.exports.users = new PouchDB(environment.serverUrl + '/_users');
}
