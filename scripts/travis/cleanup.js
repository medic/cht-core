/*
 * Delete old artefacts from the testing db
 */
const { UPLOAD_URL, BUILDS_SERVER, TRAVIS_BUILD_NUMBER } = process.env;
const BUILDS_TO_KEEP = 50;
const END_BUILD_TO_DELETE = TRAVIS_BUILD_NUMBER - BUILDS_TO_KEEP;
const END_KEY = `medic:medic:test-${END_BUILD_TO_DELETE}`;
const MAX_BUILDS_TO_DELETE = 50;
const PouchDB = require('pouchdb-core');
PouchDB.plugin(require('pouchdb-adapter-http'));

const db = new PouchDB(`${UPLOAD_URL}/${BUILDS_SERVER}`);

const get = () => {
  console.log('Getting builds...');
  return db.allDocs({ endkey: END_KEY, limit: MAX_BUILDS_TO_DELETE });
};

const markDeleted = response => {
  return response.rows
    .filter(row => row.id.startsWith('medic:medic:'))
    .map(row => {
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
    return db.bulkDocs(docs).then(results => {
      const failed = results.filter(result => !result.ok);
      if (failed.length) {
        console.error('Failed to delete these builds:');
        console.error(JSON.stringify(failed, null, 2));
        throw new Error('Failed trying to delete docs');
      }
    });
  }
};

process.on('unhandledRejection', error => {
  console.error('unhandledRejection', error);
});

get()
  .then(docs => markDeleted(docs))
  .then(docs => remove(docs))
  .catch(err => {
    console.error(`Error deleting old travis builds: "${err.message}"`);
    process.exit(1);
  });
