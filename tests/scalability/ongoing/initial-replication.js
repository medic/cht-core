const [,, instanceUrl, dataDir, threadId, skipUsers] = process.argv;
const path = require('path');
const rewire = require('rewire');

const PouchDB = require('pouchdb');
PouchDB.plugin(require('pouchdb-adapter-leveldb'));

const dataDirPath = path.resolve(dataDir || __dirname);
const users = require(path.resolve(dataDirPath, 'users.json'));

const idx = ((+threadId || 0) + (+skipUsers || 0)) % users.length;
const user = users[idx];
const dbUrl = `${instanceUrl}/medic`;

const fetchJSON = async (url) => {
  const response = await fetch(`${instanceUrl}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + btoa(`${user.username}:${user.password}`),
    }
  });
  if (response.ok) {
    return await response.json();
  }

  throw new Error(await response.text());
};

const remoteDb = new PouchDB(dbUrl, {
  skip_setup: true,
  ajax: { timeout: 30000 },
  auth: { username: user.username, password: user.password }
});

const localDb = new PouchDB(path.join(dataDirPath, `/dbs/scalability-test-${user.username}`), {
  adapter: 'leveldb',
  auto_compaction: true
});

const initialReplication = rewire('../../../webapp/src/js/bootstrapper/initial-replication');

initialReplication.__set__('setUiStatus', () => {});
initialReplication.__set__('displayTooManyDocsWarning', () => {});
initialReplication.__set__('utils', { fetchJSON });
initialReplication.__set__('window', () => {});

initialReplication.replicate(remoteDb, localDb)
  .then(() => {
    console.log('initial replication complete');
    process.exit(0);
  })
  .catch(err => {
    console.error('initial replication failed', err);
    process.exit(1);
  });
