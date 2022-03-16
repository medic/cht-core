const IS_CI = !!process.env.TEST_SUITE;

const COUCH_HOST = 'localhost';
const COUCH_PORT = IS_CI ? 5984 : 4984;
const API_PORT = IS_CI ? 5988 : 4988;

const path = require('path');

module.exports = {
  IS_CI: IS_CI,

  // connection information for the test api instance which is
  // intentionally different from the dev api instance to avoid
  // port collisions
  API_PORT,
  API_HOST: 'localhost',

  // connection information for the couchdb instance
  // locally we spin up a different CouchDB for e2e tests
  COUCH_PORT,
  COUCH_HOST,

  // test database to avoid writing to the dev db
  // TODO: we don't need to do this anymore since it's in its own docker container
  // HOWEVER, we have dodgy hard-coded work in login.js around medic-test
  DB_NAME: 'medic-test',
  MAIN_DDOC_NAME: 'medic',

  // tests create a document with this id to be referenced by org.couchdb.user contact_id
  USER_CONTACT_ID: 'e2e_contact_test_id',

  DEFAULT_USER_CONTACT_DOC: {
    _id: 'e2e_contact_test_id',
    type: 'person',
    reported_date: 1541679811408,
  },
  BASE_URL: `http://${COUCH_HOST}:${API_PORT}/`,

  DOCKER_COMPOSE_FILE: path.resolve(__dirname, '..', 'scripts', 'ci', 'cht-compose-test.yml'),
  DOCKER_SERVICE_NAME: {
    api: 'cht-api',
    sentinel: 'cht-sentinel',
  },
};
