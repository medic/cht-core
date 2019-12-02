/**
 * Delete old artefacts from the testing db
 */
const { UPLOAD_URL, BUILDS_SERVER, TRAVIS_BUILD_NUMBER } = process.env;
const BUILDS_TO_KEEP = 50;
const END_BUILD_TO_DELETE = TRAVIS_BUILD_NUMBER - BUILDS_TO_KEEP;
const END_KEY = `medic:medic:test-${END_BUILD_TO_DELETE}`;
const MAX_BUILDS_TO_DELETE = 50;
const DAYS_TO_KEEP = 100;

const PouchDB = require('pouchdb-core');
PouchDB.plugin(require('pouchdb-adapter-http'));
PouchDB.plugin(require('pouchdb-mapreduce'));

const db = new PouchDB(`${UPLOAD_URL}/${BUILDS_SERVER}`);

process.on('unhandledRejection', error => {
  console.error('unhandledRejection', error);
});

const getTestingBuilds = () => {
  console.log('Getting old testing builds...');
  return db.allDocs({ endkey: END_KEY, limit: MAX_BUILDS_TO_DELETE });
};

const remove = response => {
  const docs = response.rows
    .filter(row => row.id.startsWith('medic:medic:'))
    .map(row => {
      return {
        _id: row.id,
        _rev: row.value.rev,
        _deleted: true
      };
    });
  if (docs.length) {
    console.log(`Deleting ${docs.length} builds...`);
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

const getEndDate = () => {
  const d = new Date();
  d.setDate(d.getDate() - DAYS_TO_KEEP);
  return d.toISOString();
};

const getBranchBuilds = () => {
  console.log('Querying for old branches...');
  return db.query('builds/releases', {
    startkey: [ 'branch', 'medic', 'medic' ],
    endkey: [ 'branch', 'medic', 'medic', getEndDate() ],
    limit: MAX_BUILDS_TO_DELETE
  });
};

const getBetaBuilds = () => {
  console.log('Querying for old beta releases...');
  return db.query('builds/releases', {
    startkey: [ 'beta', 'medic', 'medic', 10000 ],
    endkey: [ 'beta', 'medic', 'medic', 0 ],
    descending: true,
    limit: MAX_BUILDS_TO_DELETE,
    skip: 5 // leave the last 5 beta releases
  });
};

const getRevs = response => {
  console.log('Getting revs...');
  const ids = response.rows
    .filter(row => row.id.startsWith('medic:medic:'))
    .map(row => row.id);
  return db.allDocs({ keys: ids });
};

const testingBuilds = () => {
  return getTestingBuilds()
    .then(remove);
};

const branchBuilds = () => {
  return getBranchBuilds()
    .then(getRevs)
    .then(remove);
};

const betaBuilds = () => {
  return getBetaBuilds()
    .then(getRevs)
    .then(remove);
};

testingBuilds()
  .then(branchBuilds)
  .then(betaBuilds)
  .catch(err => {
    console.error(`Error deleting old travis builds: "${err.message}"`);
    process.exit(1);
  });
