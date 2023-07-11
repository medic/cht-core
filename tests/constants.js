const USERNAME = 'admin';
const PASSWORD = 'pass';
const API_HOST = 'localhost';
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
  SUITES: {
    basic: [
      './admin/**/*.wdio-spec.js',
      './login/**/*.wdio-spec.js',
      './translations/**/*.wdio-spec.js',
      './more-options-menu/**/*.wdio-spec.js',
      './users/**/*.wdio-spec.js'
    ],
    passive: [
      './about/**/*.wdio-spec.js',
      './navigation/**/*.wdio-spec.js',
      './privacy-policy/**/*.wdio-spec.js',
    ],
    workflows: [
      './analytics/**/*.wdio-spec.js',
      './contacts/**/*.wdio-spec.js',
      './reports/**/*.wdio-spec.js',
      './targets/**/*.wdio-spec.js',
      './tasks/**/*.wdio-spec.js',
      './sms/**/*.wdio-spec.js',
    ],
    technical:[
      './db/**/*.wdio-spec.js',
      './purge/**/*.wdio-spec.js',
      './pwa/**/*.wdio-spec.js',
      './service-worker/**/*.wdio-spec.js',
      './transitions/**/*.wdio-spec.js',
      './telemetry/**/*.wdio-spec.js'
    ],

    enketo: [
      './enketo/**/*.wdio-spec.js',
    ],
    
  },
};
