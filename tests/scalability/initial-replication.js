const [,, threadId, userPrefix, pass, userCount] = process.argv;
const username = `${userPrefix}-${threadId%userCount}`;

const PouchDB = require('pouchdb');
PouchDB.plugin(require('pouchdb-adapter-memory'));
const remoteDb = new PouchDB('http://localhost:5988/medic', {
  skip_setup: true,
  ajax: { timeout: 30000 },
  auth: { username: username, password: pass }
});
const localDb = new PouchDB(`scalability-test-${threadId}`, {
  adapter: 'memory',
  auto_compaction: true
});

const replicate = () => {
  return localDb.replicate.from(remoteDb, {
    live: false,
    retry: false,
    heartbeat: 10000
  });
};

replicate()
  .then(() => {
    console.log('initial replication complete');
    process.exit(0);
  })
  .catch(err => {
    console.error('initial replication failed', err);
    process.exit(1);
  });
