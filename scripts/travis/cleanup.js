/*
 * Delete old artefacts from the testing db
 */
const { UPLOAD_URL, TRAVIS_BUILD_NUMBER } = process.env;
const BUILDS_TO_KEEP = 50;
const END_BUILD_TO_DELETE = TRAVIS_BUILD_NUMBER - BUILDS_TO_KEEP;
const END_KEY = `medic:medic:test-${END_BUILD_TO_DELETE}`;
const MAX_BUILDS_TO_DELETE = 50;
const PouchDB = require('pouchdb-core');
PouchDB.plugin(require('pouchdb-adapter-http'));

const db = new PouchDB(`${UPLOAD_URL}/_couch/builds_testing`);

const get = () => {
  console.log(`Getting builds...`);
  return db.allDocs({ endkey: END_KEY, limit: MAX_BUILDS_TO_DELETE });
};

const markDeleted = response => {
  return response.rows.map(row => {
    return {
      _id: row.id,
      _rev: row.value.rev,
      _deleted: true
    };
  });
};

const remove = docs => {
  if (docs.length) {
    console.log(`Deleting the oldest ${docs.length} builds...`);
    return db.bulkDocs(docs);
  }
};

get()
  .then(markDeleted)
  .then(remove);
