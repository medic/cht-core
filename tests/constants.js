module.exports = {

  // connection information for the test api instance which is
  // intentionally different from the dev api instance to avoid
  // port collisions
  API_PORT: 5998,
  API_HOST: 'localhost',

  // connection information for the couchdb instance
  COUCH_PORT: 5984,
  COUCH_HOST: 'localhost',

  // test database to avoid writing to the dev db
  DB_NAME: 'medic-test',
  MAIN_DDOC_NAME: 'medic',

  // tests create a document with this id to be referenced by org.couchdb.user contact_id
  USER_CONTACT_ID: 'e2e_contact_test_id',

  DEFAULT_USER_CONTACT_DOC: {
    _id: 'e2e_contact_test_id',
    type: 'person',
    reported_date: 1541679811408, 
  },
};
