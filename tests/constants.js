const USERNAME = 'admin';
const PASSWORD = 'pass';
const API_HOST = `localhost${process.env.NGINX_HTTPS_PORT ? `:${process.env.NGINX_HTTPS_PORT}` : ''}`;
const PROTOCOL = 'https://';

module.exports = {
  IS_CI: !!process.env.CI,

  // connection information for the test api instance which is
  // intentionally different from the dev api instance to avoid
  // port collisions
  API_HOST,

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
  BASE_URL: `${PROTOCOL}${API_HOST}`,
  BASE_URL_AUTH: `${PROTOCOL}${USERNAME}:${PASSWORD}@${API_HOST}`,

  // nginx certificate setting
  CERTIFICATE_MODE: 'SELF_SIGNED',
  DOWNLOAD_DIRECTORY: 'tempDownload',

  USERNAME,
  PASSWORD,
};
