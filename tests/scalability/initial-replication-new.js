const [,, threadId] = process.argv;

process.env.NODE_TLS_REJECT_UNAUTHORIZED=0; // allow self signed certificates

const rewire = require('rewire');
const sinon = require('sinon');
const rpn = require('request-promise-native');

const config = require('./config.json');
const user = config.users[threadId % config.users.length];

const fetchJSON = async (url) => {
  return await rpn.get({
    url: `${config.url}${url}`,
    auth: { username: user.name, password: user.pass },
    json: true,
  });
};

const PouchDB = require('pouchdb');
PouchDB.plugin(require('./pouchdb-adapter-void'));

const remoteDb = new PouchDB(`${config.url}/medic`, {
  skip_setup: true,
  ajax: { timeout: 30000 },
  auth: { username: user.name, password: user.pass }
});
const localDb = new PouchDB(`scalability-test-${threadId}`, {
  adapter: 'void',
  auto_compaction: true
});

const initialReplication = rewire('../../webapp/src/js/bootstrapper/initial-replication');
initialReplication.__set__('setUiStatus', sinon.stub());
initialReplication.__set__('displayTooManyDocsWarning', sinon.stub());
initialReplication.__set__('utils', { fetchJSON });
initialReplication.__set__('window', sinon.stub());

initialReplication.replicate(remoteDb, localDb)
  .then(() => {
    console.log('initial replication complete'); // eslint-disable-line no-console
    process.exit(0);
  })
  .catch(err => {
    console.error('initial replication failed', err); // eslint-disable-line no-console
    process.exit(1);
  });
