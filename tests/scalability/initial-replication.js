const [,, threadId] = process.argv;

const config = require('./config.json');
const user = config.users[threadId % config.users.length];

const rewire = require('rewire');

const PouchDB = require('pouchdb');
PouchDB.plugin(require('pouchdb-adapter-memory'));

const fetchJSON = async (url) => {
  const response = await fetch(`${config.url}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + btoa(`${user.name}:${user.pass}`),
    }
  });
  if (response.ok) {
    return await response.json();
  }

  throw new Error(await response.text());
};

const remoteDb = new PouchDB(`${config.url}/medic`, {
  skip_setup: true,
  ajax: { timeout: 30000 },
  auth: { username: user.name, password: user.pass }
});
const localDb = new PouchDB(`scalability-test-${threadId}`, {
  adapter: 'memory',
  auto_compaction: true
});

const initialReplication = rewire('../../webapp/src/js/bootstrapper/initial-replication');

initialReplication.__set__('setUiStatus', () => {});
initialReplication.__set__('displayTooManyDocsWarning', () => {});
initialReplication.__set__('utils', { fetchJSON });
initialReplication.__set__('window', () => {});

initialReplication.replicate(remoteDb, localDb)
  .then(() => {
    console.log('initial replication complete'); // eslint-disable-line no-console
    process.exit(0);
  })
  .catch(err => {
    console.error('initial replication failed', err); // eslint-disable-line no-console
    process.exit(1);
  });
