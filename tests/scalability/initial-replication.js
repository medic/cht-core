const [,, threadId] = process.argv;

const config = require('./config.json');
const user = config.users[threadId % config.users.length];

const PouchDB = require('pouchdb');
PouchDB.plugin(require('pouchdb-adapter-memory'));
//PouchDB.plugin(require('./pouchdb-adapter-void'));

const remoteDb = new PouchDB(config.url, {
  adapter: 'http',
  since: 0,
  skip_setup: true,
  ajax: { timeout: 30000 },
  auth: { username: user.name, password: user.pass }
});
const localDb = new PouchDB(`scalability-test-${threadId}`, {
  adapter: 'memory',
  //adapter: 'void',
  auto_compaction: true
});

const replicate = () => {
  return localDb.replicate.from(remoteDb, {
    live: false,
    retry: false,
    heartbeat: 10000
  }).on('change', () => {
    console.log('onchange');
  });
};

replicate()
  .then(() => {
    console.log('initial replication complete'); // eslint-disable-line no-console
    process.exit(0);
  })
  .catch(err => {
    console.error('initial replication failed', err); // eslint-disable-line no-console
    process.exit(1);
  });
