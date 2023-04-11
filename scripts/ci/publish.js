/*
 * Publish the ddoc from the testing db to staging.
 */
const {
  MARKET_URL,
  BUILD_NUMBER,
  BUILDS_SERVER,
  STAGING_SERVER,
  TAG,
  BRANCH
} = process.env;
const releaseName = TAG || BRANCH;
const PouchDB = require('pouchdb-core');
PouchDB.plugin(require('pouchdb-adapter-http'));

if (!releaseName) {
  console.log('Not a tag or a branch so not publishing. Most likely this is a PR build which is merged with master');
  process.exit(0);
}

const testingDb = new PouchDB(`${MARKET_URL}/${BUILDS_SERVER}`);
const stagingDb = new PouchDB(`${MARKET_URL}/${STAGING_SERVER}`);

const testingDocId = `medic:medic:test-${BUILD_NUMBER}`;
const stagingDocId = `medic:medic:${releaseName}`;

const get = () => {
  console.log(`Getting "${testingDocId}"...`);
  return testingDb.get(testingDocId, { attachments: true });
};

const prepare = doc => {
  console.log('Checking if already published...');
  doc._id = stagingDocId;
  doc._rev = undefined;
  return stagingDb
    .get(stagingDocId)
    .then(current => {
      console.log(`Exising release found - updating...`);
      doc._rev = current._rev;
      return doc;
    })
    .catch(err => {
      if (err.status === 404) {
        console.log(`No exising release found - creating...`);
        return doc;
      }
      throw err;
    });
};

const publish = doc => {
  console.log(`Publishing doc...`);
  return stagingDb.put(doc);
};

get()
  .then(prepare)
  .then(publish)
  .then(response => {
    console.log(`${response.id} published!`);
    process.exit(0);
  })
  .catch(err => {
    console.error('Publishing failed');
    console.error(err);
    process.exit(1);
  });
