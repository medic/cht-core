const PouchDB = require('pouchdb-core'),
  logger = require('../src/lib/logger');
PouchDB.plugin(require('pouchdb-adapter-http'));
PouchDB.plugin(require('pouchdb-mapreduce'));
PouchDB.plugin(require('pouchdb-replication'));

const { COUCH_URL, UNIT_TEST_ENV } = process.env;

const request = require('request'),
      url = require('url');

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

  module.exports.allDbs = stubMe('allDbs');
  module.exports.get = stubMe('get');
} else if (COUCH_URL) {
  // strip trailing slash from to prevent bugs in path matching
  const couchUrl = COUCH_URL && COUCH_URL.replace(/\/$/, '');
  const parsedUrl = url.parse(couchUrl);

  module.exports.serverUrl = couchUrl.slice(0, couchUrl.lastIndexOf('/'));

  const fetchFn = (url, opts) => {
    opts.headers.set('X-Medic-Service', 'sentinel');
    opts.headers.set('X-Medic-User', 'sentinel');
    return PouchDB.fetch(url, opts);
  };

  module.exports.medic = new PouchDB(couchUrl, { fetch: fetchFn });
  module.exports.medicDbName = parsedUrl.path.replace('/', '');
  module.exports.sentinel = new PouchDB(`${couchUrl}-sentinel`, {
    fetch: fetchFn,
  });

  module.exports.allDbs = () => new Promise((resolve, reject) => {
    request({ url: `${module.exports.serverUrl}/_all_dbs`, json: true }, (err, response, body) => {
      return err ? reject(err) : resolve(body);
    });
  });
  module.exports.get = db => new PouchDB(`${module.exports.serverUrl}/${db}`);
} else {
  logger.warn(
    'Please define a COUCH_URL in your environment e.g. \n' +
      'export COUCH_URL=\'http://admin:123qwe@localhost:5984/medic\'\n\n' +
      'If you are running unit tests use UNIT_TEST_ENV=1 in your environment.\n'
  );
  process.exit(1);
}
