const PouchDB = require('pouchdb-core'),
  logger = require('./logger');
PouchDB.plugin(require('pouchdb-adapter-http'));
PouchDB.plugin(require('pouchdb-mapreduce'));

const { COUCH_URL, UNIT_TEST_ENV } = process.env;

if (UNIT_TEST_ENV) {
  const stubMe = functionName => () => {
    logger.error(
      new Error(
        `db.${functionName}() not stubbed!  UNIT_TEST_ENV=${UNIT_TEST_ENV}.  Please stub PouchDB functions that will be interacted with in unit tests.`
      )
    );
    process.exit(1);
  };

  module.exports.medic = {
    allDocs: stubMe('allDocs'),
    bulkDocs: stubMe('bulkDocs'),
    bulkGet: stubMe('bulkGet'),
    put: stubMe('put'),
    post: stubMe('post'),
    query: stubMe('query'),
    get: stubMe('get'),
    getAttachment: stubMe('getAttachment'),
    changes: stubMe('changes'),
    info: stubMe('info'),
  };

  module.exports.users = {
    allDocs: stubMe('allDocs'),
    bulkDocs: stubMe('bulkDocs'),
    put: stubMe('put'),
    post: stubMe('post'),
    query: stubMe('query'),
    get: stubMe('get'),
    changes: stubMe('changes'),
  };
} else if (COUCH_URL) {
  // strip trailing slash from to prevent bugs in path matching
  const couchUrl = COUCH_URL.replace(/\/$/, '');
  module.exports.serverUrl = couchUrl.slice(0, couchUrl.lastIndexOf('/'));

  const DB = new PouchDB(couchUrl, {
    fetch: (url, opts) => {
      opts.headers.set('X-Medic-Service', 'api');
      return PouchDB.fetch(url, opts);
    },
  });
  DB.setMaxListeners(0);
  module.exports.medic = DB;

  const usersDbUrl = module.exports.serverUrl + '/_users';
  module.exports.users = new PouchDB(usersDbUrl);
} else {
  logger.warn(
    'Please define a COUCH_URL in your environment e.g. \n' +
      'export COUCH_URL=\'http://admin:123qwe@localhost:5984/medic\'\n\n' +
      'If you are running unit tests use UNIT_TEST_ENV=1 in your environment.\n'
  );
  process.exit(1);
}
