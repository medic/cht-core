const PouchDB = require('pouchdb-core');
PouchDB.plugin(require('pouchdb-adapter-http'));
PouchDB.plugin(require('pouchdb-mapreduce'));

const { COUCH_URL } = process.env;
// strip trailing slash from to prevent bugs in path matching
const couchUrl = COUCH_URL && COUCH_URL.replace(/\/$/, '');

module.exports.medic = new PouchDB(couchUrl);
module.exports.audit = new PouchDB(`${couchUrl}-audit`);
