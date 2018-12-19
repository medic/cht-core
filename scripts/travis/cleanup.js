/*
 * Delete the artefact from the testing db
 */

const { UPLOAD_URL, TRAVIS_BUILD_NUMBER } = process.env;
const PouchDB = require('pouchdb-core');
PouchDB.plugin(require('pouchdb-adapter-http'));

const db = new PouchDB(`${UPLOAD_URL}/_couch/builds_testing`);
const docId = `medic:medic:test-${TRAVIS_BUILD_NUMBER}`;

const get = () => {
  console.log(`Getting "${docId}"...`);
  return db.get(docId);
};

const remove = doc => {
  console.log(`Deleting "${docId}"...`);
  return db.remove(doc);
};

get().then(remove);
