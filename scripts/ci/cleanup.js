/**
 * Delete old artefacts from the testing and staging dbs
 */
const { MARKET_URL } = process.env;

const BUILDS_SERVER = '_couch/builds_testing';
const BUILDS_EXTERNAL_SERVER = '_couch/builds_external';
const STAGING_SERVER_3 = '_couch/builds';   // 3.x market
const STAGING_SERVER_4 = '_couch/builds_4'; // 4.x market

const MAX_BUILDS_TO_DELETE = 100; // don't try and delete too many at once
const BETAS_TO_KEEP = 5; // keep the most recent 5 beta builds
const DAYS_TO_KEEP_BRANCH = 100; // branch builds are kept for 100 days to allow for AT
const DAYS_TO_KEEP_TEST = 7; // testing builds are kept for 7 days to allow for CI to complete

const PouchDB = require('pouchdb-core');
PouchDB.plugin(require('pouchdb-adapter-http'));
PouchDB.plugin(require('pouchdb-mapreduce'));

const testingDb = new PouchDB(`${MARKET_URL}/${BUILDS_SERVER}`);
const externalDb = new PouchDB(`${MARKET_URL}/${BUILDS_EXTERNAL_SERVER}`);
const stagingDb3 = new PouchDB(`${MARKET_URL}/${STAGING_SERVER_3}`);
const stagingDb4 = new PouchDB(`${MARKET_URL}/${STAGING_SERVER_4}`);

process.on('unhandledRejection', error => {
  console.error('unhandledRejection', error);
});

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

const getEndDate = (daysToKeep) => {
  const d = new Date();
  d.setDate(d.getDate() - daysToKeep);
  return d.toISOString();
};

const getCurrentRevs = (db, response) => {
  console.log('Getting revs...');
  const ids = response.rows
    .filter(row => row.id.startsWith('medic:medic:'))
    .map(row => row.id);
  return db.allDocs({ keys: ids });
};

const queryReleases = (db, options) => {
  return db.query('builds/releases', options)
    .then(response => getCurrentRevs(db, response));
};

const queryReleasesByDate = (db, daysToKeep) => {
  return queryReleases(db, {
    startkey: [ 'branch', 'medic', 'medic' ],
    endkey: [ 'branch', 'medic', 'medic', getEndDate(daysToKeep) ],
    limit: MAX_BUILDS_TO_DELETE
  });
};

const testingBuilds = () => {
  console.log('Querying for old testing builds...');
  return queryReleasesByDate(testingDb, DAYS_TO_KEEP_TEST)
    .then(response => remove(testingDb, response));
};

const externalBuilds = () => {
  console.log('Querying for old external builds...');
  return queryReleasesByDate(externalDb, DAYS_TO_KEEP_TEST)
    .then(response => remove(externalDb, response));
};

const branchBuilds3 = () => {
  console.log('Querying for old branch builds in 3.x market...');
  return queryReleasesByDate(stagingDb3, DAYS_TO_KEEP_BRANCH)
    .then(response => remove(stagingDb3, response));
};

const branchBuilds4 = () => {
  console.log('Querying for old branch builds in 4.x market...');
  return queryReleasesByDate(stagingDb4, DAYS_TO_KEEP_BRANCH)
    .then(response => remove(stagingDb4, response));
};

const betaBuilds = () => {
  console.log('Querying for old beta releases...');
  return queryReleases(stagingDb, {
    startkey: [ 'beta', 'medic', 'medic', 10000 ],
    endkey: [ 'beta', 'medic', 'medic', 0 ],
    limit: MAX_BUILDS_TO_DELETE,
    descending: true,
    skip: BETAS_TO_KEEP // leave the last n beta releases
  })
    .then(response => remove(stagingDb, response));
};

Promise.resolve()
  .then(testingBuilds)
  .then(externalBuilds)
  .then(branchBuilds3)
  .then(branchBuilds4)
  .then(betaBuilds)
  .catch(err => {
    console.error(`Error deleting old CI builds: "${err.message}"`);
    process.exit(1);
  });
