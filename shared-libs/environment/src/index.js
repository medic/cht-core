const logger = require('@medic/logger');

const { COUCH_URL, BUILDS_URL, PROXY_CHANGE_ORIGIN = false } = process.env;
const DEFAULT_BUILDS_URL = 'https://staging.dev.medicmobile.org/_couch/builds_4';

const isString = value => typeof value === 'string' || value instanceof String;
const isTrue = value => isString(value) ? value.toLowerCase() === 'true' : value === true;

const logError = () => {
  logger.error(
    'Please define a valid COUCH_URL in your environment e.g. \n' +
    'export COUCH_URL=\'http://admin:123qwe@localhost:5984/medic\'\n\n' +
    'If you are running unit tests use UNIT_TEST_ENV=1 in your environment.\n'
  );
  process.exit(1);
};

if (!COUCH_URL) {
  logError();
}

try {
  // strip trailing slash from to prevent bugs in path matching
  const couchUrl = COUCH_URL.replace(/\/$/, '');
  const parsedUrl = new URL(couchUrl);
  parsedUrl.username = '';
  parsedUrl.password = '';
  const serverUrl = new URL('/', parsedUrl);

  module.exports = {
    couchUrl: parsedUrl.toString(),
    buildsUrl: BUILDS_URL || DEFAULT_BUILDS_URL,
    serverUrl: serverUrl.toString(),
    protocol: parsedUrl.protocol,
    port: parsedUrl.port,
    host: parsedUrl.hostname,
    db: parsedUrl.pathname.replace('/', ''),
    ddoc: 'medic',
    proxies: {
      // See http-proxy (https://www.npmjs.com/package/http-proxy#options)
      // "changeOrigin: true/false, Default: false - changes the origin of the host header to the target URL"
      // This allows proxying from HTTP to HTTPS without encountering certificate issues
      // for environments where TLS termination happens elsewhere.
      changeOrigin: isTrue(PROXY_CHANGE_ORIGIN)
    },
    proxyAuthHeaders: {
      admin: {
        'X-Auth-CouchDB-UserName': 'username',
        'X-Auth-CouchDB-Roles': '_admin',
        'X-Auth-CouchDB-Token': '5fdf567854fdf2380afca469ebf425c1d4e167d0cc8dc24eacf40344adbe06a8',
      },
      none: {
        'X-Auth-CouchDB-UserName': null,
        'X-Auth-CouchDB-Roles': null,
        'X-Auth-CouchDB-Token': null,
      }
    },
  };
} catch (err) {
  if (err.message === 'Invalid URL') {
    logError();
  }

  logger.error(err);
  process.exit(1);
}


module.exports.isTesting = module.exports.db === 'medic-test';
