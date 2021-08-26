/**
 * Delete old artefacts from the testing and staging dbs
 */
const { MARKET_URL, BUILDS_SERVER, STAGING_SERVER } = process.env;

const MAX_BUILDS_TO_DELETE = 100; // don't try and delete too many at once
const BETAS_TO_KEEP = 5; // keep the most recent 5 beta builds
const DAYS_TO_KEEP_BRANCH = 100; // branch builds are kept for 100 days to allow for AT
const DAYS_TO_KEEP_TEST = 7; // testing builds are kept for 7 days to allow for CI to complete

const PouchDB = require('pouchdb-core');
PouchDB.plugin(require('pouchdb-adapter-http'));
PouchDB.plugin(require('pouchdb-mapreduce'));

const testingDb = new PouchDB(`${MARKET_URL}/${BUILDS_SERVER}`);
const stagingDb = new PouchDB(`${MARKET_URL}/${STAGING_SERVER}`);

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

const branchBuilds = () => {
  console.log('Querying for old branch builds...');
  return queryReleasesByDate(stagingDb, DAYS_TO_KEEP_BRANCH)
    .then(response => remove(stagingDb, response));
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

testingBuilds()
  .then(branchBuilds)
  .then(betaBuilds)
  .catch(err => {
    console.error(`Error deleting old travis builds: "${err.message}"`);
    process.exit(1);
  });
