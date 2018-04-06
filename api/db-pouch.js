const PouchDB = require('pouchdb-core');
PouchDB.plugin(require('pouchdb-adapter-http'));
PouchDB.plugin(require('pouchdb-mapreduce'));

const { COUCH_URL, UNIT_TEST_ENV } = process.env;

if(UNIT_TEST_ENV) {
  module.exports.medic = {
    allDocs: () => Promise.resolve({ offset:0, total_rows:0, rows:[] }),
    bulkDocs: () => Promise.resolve([]),
    put: doc => Promise.resolve({ ok:true, id:doc._id, rev:'1' }),
    query: () => Promise.resolve({ offset:0, total_rows:0, rows:[] }),
  };
} else if(COUCH_URL) {
  // strip trailing slash from to prevent bugs in path matching
  const couchUrl = COUCH_URL && COUCH_URL.replace(/\/$/, '');
  const DB = new PouchDB(couchUrl);

  module.exports.medic = DB;
} else {
  console.log(
    'Please define a COUCH_URL in your environment e.g. \n' +
    'export COUCH_URL=\'http://admin:123qwe@localhost:5984/medic\'\n\n' +
    'If you are running unit tests use UNIT_TEST_ENV=1 in your environment.\n'
  );
  process.exit(1);
}
