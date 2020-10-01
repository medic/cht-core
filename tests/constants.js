const IS_TRAVIS = !!process.env.TEST_SUITE;

module.exports = {
  IS_TRAVIS: IS_TRAVIS,

  // connection information for the test api instance which is
  // intentionally different from the dev api instance to avoid
  // port collisions
  API_PORT: IS_TRAVIS ? 5988 : 4988,
  API_HOST: 'localhost',

  // connection information for the couchdb instance
  // locally we spin up a different CouchDB for e2e tests
  COUCH_PORT: IS_TRAVIS ? 5984 : 4984,
  COUCH_HOST: 'localhost',
  COUCH_NODE_NAME: IS_TRAVIS ? process.env.COUCH_NODE_NAME : 'nonode@nohost',

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
  EMULATED_DEVICE: 'Galaxy S5'
};
