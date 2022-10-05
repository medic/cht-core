const PouchDB = require('pouchdb');
const path = require('path');
PouchDB.plugin(require('pouchdb-adapter-leveldb'));

const [,, instanceUrl, dataDir, threadId, skipUsers] = process.argv;
const dataDirPath = path.resolve(dataDir || __dirname);
const users = require(path.resolve(dataDirPath, 'users-low.json'));

const idx = ((+threadId || 0) + (+skipUsers || 0)) % users.length;
const user = users[idx];
const dbUrl = `${instanceUrl}/medic`;

const remoteDb = new PouchDB(dbUrl, {
  skip_setup: true,
  ajax: { timeout: 30000 },
  auth: { username: user.username, password: user.password }
});

const localDb = new PouchDB(path.join(dataDirPath, `/dbs/scalability-test-${user.username}`), { adapter: 'leveldb' });

const replicateFrom = () => {
  return localDb.replicate
    .from(remoteDb, { live: false, retry: false, heartbeat: 10000 })
    .catch(err => {
      console.error('initial replication failed', err); // eslint-disable-line no-console
      process.exit(1);
    });
};

const replicateTo = () => {
  return localDb.replicate
    .to(remoteDb, { live: false, retry: false, heartbeat: 10000 })
    .catch(err => {
      console.error('initial replication failed', err); // eslint-disable-line no-console
      process.exit(1);
    });
};

(async () => {
  await replicateFrom();
  await replicateTo();
})();

