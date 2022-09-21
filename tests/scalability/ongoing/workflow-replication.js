const path = require('path');
const PouchDB = require('pouchdb');
PouchDB.plugin(require('pouchdb-adapter-leveldb'));
const { performance } = require('perf_hooks');

const [,, instanceUrl, dataDir, threadId, skipUsers] = process.argv;
const dataDirPath = path.resolve(dataDir || __dirname);
const users = require(path.resolve(dataDirPath, 'users.json'));
const config = require('./config');

const dataFactory = require('./data-factory');

const idx = ((+threadId || 0) + +skipUsers) % users.length;
console.log(idx, skipUsers);
const user = users[idx];
console.log(user);
let clinics;
const dbUrl = `${instanceUrl}/medic`;

const remoteDb = new PouchDB(dbUrl, {
  skip_setup: true,
  ajax: { timeout: 30000 },
  auth: { username: user.username, password: user.password }
});

const localDb = new PouchDB(path.join(dataDirPath, `/dbs/scalability-test-${user.username}`), { adapter: 'leveldb' });

const replicateFrom = () => {
  return localDb.replicate
    .from(remoteDb, { live: false, retry: true, heartbeat: 10000 })
    .catch(err => {
      console.error('initial replication failed', err); // eslint-disable-line no-console
      process.exit(1);
    });
};

const replicateTo = () => {
  return localDb.replicate
    .to(remoteDb, { live: false, retry: true, heartbeat: 10000 })
    .catch(err => {
      console.error('initial replication failed', err); // eslint-disable-line no-console
      process.exit(1);
    });
};

const replicate = async () => {
  const t = performance.now();
  await replicateTo();
  console.log('replicate to took ', performance.now() - t);
  const l = performance.now();
  await replicateFrom();
  console.log('replicate from took ', performance.now() - l);
};

const getRandomParent = () => {
  const idx = Math.floor(Math.random() * clinics.length);
  return clinics[idx];
};

const getClinics = async () => {
  const contacts = await localDb.query(
    'medic-client/contacts_by_type',
    { key: ['clinic'], include_docs: true }
  );
  clinics = contacts.rows.map(row => row.doc);
};

const generateData = async () => {
  const t = performance.now();
  const docs = [];
  for (let i = 0; i < config.workflowContactsNbr.person; i++) {
    const parent = getRandomParent();
    if (!parent) {
      const empty = clinics.filter(clinic => !clinic);
      console.log(empty);
      throw new Error('Error choosing random clinic');
    }
    const [person] = dataFactory.generatePerson(parent, 'member_eligible_woman');
    const reports = dataFactory.generateReports(person, parent);
    docs.push(person, ...reports);
  }
  console.log('generation took ', performance.now() - t);
  const l = performance.now();
  await localDb.bulkDocs(docs);
  console.log('saving took ', performance.now() - l);
};

(async () => {
  try {
    await getClinics();
    for (let i = 0; i < config.workflowContactsNbr.iterations; i++) {
      await generateData();
      await replicate();
    }
  } catch (err) {
    console.error('Error while replicating workflow data', err);
    process.exit(1);
  }
})();
