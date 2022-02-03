const PouchDB = require('pouchdb-core');
const logger = require('../src/lib/logger');
PouchDB.plugin(require('pouchdb-adapter-http'));
PouchDB.plugin(require('pouchdb-mapreduce'));
PouchDB.plugin(require('pouchdb-replication'));
const serverChecks = require('@medic/server-checks');

const { COUCH_URL, UNIT_TEST_ENV } = process.env;

const request = require('request');

if (UNIT_TEST_ENV) {
  const stubMe = functionName => () => {
    logger.error(
      new Error(
        `db.${functionName}() not stubbed!  UNIT_TEST_ENV=${UNIT_TEST_ENV}. ` +
        `Please stub PouchDB functions that will be interacted with in unit tests.`
      )
    );
    process.exit(1);
  };

  module.exports.medic = {
    allDocs: stubMe('allDocs'),
    bulkDocs: stubMe('bulkDocs'),
    put: stubMe('put'),
    remove: stubMe('remove'),
    post: stubMe('post'),
    query: stubMe('query'),
    get: stubMe('get'),
    changes: stubMe('changes'),
  };

  module.exports.sentinel = {
    allDocs: stubMe('allDocs'),
    bulkDocs: stubMe('bulkDocs'),
    put: stubMe('put'),
    post: stubMe('post'),
    query: stubMe('query'),
    get: stubMe('get'),
    changes: stubMe('changes'),
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


  module.exports.allDbs = stubMe('allDbs');
  module.exports.get = stubMe('get');
  module.exports.close = stubMe('close');
  module.exports.medicDbName = stubMe('medicDbName');
} else if (COUCH_URL) {
  const fetch = (url, opts) => {
    // Adding audit flags (haproxy) Service and user that made the request initially.
    opts.headers.set('X-CHT-Service', 'sentinel');
    opts.headers.set('X-CHT-User', 'sentinel');
    return PouchDB.fetch(url, opts);
  };

  module.exports.initialize = async () => {
    const username = 'cht-sentinel';
    const { couchUrl, serverUrl, dbName } = await serverChecks.getServerUrls(username);

    module.exports.couchUrl = couchUrl.toString();
    module.exports.serverUrl = serverUrl.toString();
    module.exports.medic = new PouchDB(couchUrl.toString(), { fetch });
    module.exports.medicDbName = dbName;
    module.exports.sentinel = new PouchDB(`${couchUrl}-sentinel`, { fetch });
    module.exports.users = new PouchDB(`${module.exports.serverUrl}/_users`, { fetch });
  };

  module.exports.allDbs = () => new Promise((resolve, reject) => {
    request({ url: `${module.exports.serverUrl}/_all_dbs`, json: true }, (err, response, body) => {
      return err ? reject(err) : resolve(body);
    });
  });
  module.exports.get = db => new PouchDB(`${module.exports.serverUrl}/${db}`);
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
} else {
  logger.warn(
    'Please define a COUCH_URL in your environment e.g. \n' +
      'export COUCH_URL=\'http://admin:123qwe@localhost:5984/medic\'\n\n' +
      'If you are running unit tests use UNIT_TEST_ENV=1 in your environment.\n'
  );
  process.exit(1);
}
