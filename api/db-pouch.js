const PouchDB = require('pouchdb-core');
PouchDB.plugin(require('pouchdb-adapter-http'));
PouchDB.plugin(require('pouchdb-mapreduce'));

const { COUCH_URL } = process.env;
// strip trailing slash from to prevent bugs in path matching
const couchUrl = COUCH_URL && COUCH_URL.replace(/\/$/, '');

const db = {};

if (couchUrl) {
  // couchUrl isn't supplied in testing
  db._url = couchUrl;
  db.medic = new PouchDB(couchUrl);
  db.audit = new PouchDB(`${couchUrl}-audit`);
}

module.exports = db;
