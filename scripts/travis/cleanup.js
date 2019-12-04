/**
 * Delete old artefacts from the testing and staging dbs
 */
const { UPLOAD_URL, BUILDS_SERVER, STAGING_SERVER, TRAVIS_BUILD_NUMBER } = process.env;
const BUILDS_TO_KEEP = 50;
const END_BUILD_TO_DELETE = TRAVIS_BUILD_NUMBER - BUILDS_TO_KEEP;
const MAX_BUILDS_TO_DELETE = 50;
const BETAS_TO_KEEP = 5;
const DAYS_TO_KEEP = 100;

const PouchDB = require('pouchdb-core');
PouchDB.plugin(require('pouchdb-adapter-http'));
PouchDB.plugin(require('pouchdb-mapreduce'));

const testingDb = new PouchDB(`${UPLOAD_URL}/${BUILDS_SERVER}`);
const stagingDb = new PouchDB(`${UPLOAD_URL}/${STAGING_SERVER}`);

process.on('unhandledRejection', error => {
  console.error('unhandledRejection', error);
});

const getTestingBuilds = db => {
  console.log('Getting old testing builds...');
  return db.allDocs({
    endkey: `medic:medic:test-${END_BUILD_TO_DELETE}`,
    limit: MAX_BUILDS_TO_DELETE
  });
};

const remove = (db, response) => {
  const docs = response.rows
    .filter(row => row.id.startsWith('medic:medic:'))
    .map(row => {
      return {
        _id: row.id,
        _rev: row.value.rev,
        _deleted: true
      };
    });
  console.log(`Deleting ${docs.length} builds...`);
  if (docs.length) {
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

const getBranchBuilds = db => {
  console.log('Querying for old branches...');
  return db.query('builds/releases', {
    startkey: [ 'branch', 'medic', 'medic' ],
    endkey: [ 'branch', 'medic', 'medic', getEndDate() ],
    limit: MAX_BUILDS_TO_DELETE
  });
};

const getBetaBuilds = db => {
  console.log('Querying for old beta releases...');
  return db.query('builds/releases', {
    startkey: [ 'beta', 'medic', 'medic', 10000 ],
    endkey: [ 'beta', 'medic', 'medic', 0 ],
    limit: MAX_BUILDS_TO_DELETE,
    descending: true,
    skip: BETAS_TO_KEEP // leave the last n beta releases
  });
};

const getCurrentRevs = (db, response) => {
  console.log('Getting revs...');
  const ids = response.rows
    .filter(row => row.id.startsWith('medic:medic:'))
    .map(row => row.id);
  return db.allDocs({ keys: ids });
};

const testingBuilds = () => {
  return getTestingBuilds(testingDb)
    .then(response => remove(testingDb, response));
};

const branchBuilds = () => {
  return getBranchBuilds(stagingDb)
    .then(response => getCurrentRevs(stagingDb, response))
    .then(response => remove(stagingDb, response));
};

const betaBuilds = () => {
  return getBetaBuilds(stagingDb)
    .then(response => getCurrentRevs(stagingDb, response))
    .then(response => remove(stagingDb, response));
};

testingBuilds()
  .then(branchBuilds)
  .then(betaBuilds)
  .catch(err => {
    console.error(`Error deleting old travis builds: "${err.message}"`);
    process.exit(1);
  });
