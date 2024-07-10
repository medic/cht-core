const path = require('path');
const logger = require('@medic/logger');

const { 
  UNIT_TEST_ENV,
  COUCH_URL,
  BUILDS_URL, 
  PROXY_CHANGE_ORIGIN = false
} = process.env;

const DEFAULT_BUILDS_URL = 'https://staging.dev.medicmobile.org/_couch/builds_4';

const isString = value => typeof value === 'string' || value instanceof String;
const isTrue = value => isString(value) ? value.toLowerCase() === 'true' : value === true;

if (UNIT_TEST_ENV) {
  module.exports = {
    serverUrl: '',
    serverUrlNoAuth: '',
    db: '',
    ddoc: '',
    couchUrl: '',
    port: '',
    host: '',
    protocol: '',
    buildsUrl: '',
    proxies: {
      changeOrigin: isTrue(PROXY_CHANGE_ORIGIN)
    }
  };
} else if (COUCH_URL) {
  // strip trailing slash from to prevent bugs in path matching
  const couchUrl = COUCH_URL.replace(/\/$/, '');
  const parsedUrl = new URL(couchUrl);
  const serverUrl = new URL('/', parsedUrl);
  const serverUrlNoAuth = new URL('/', parsedUrl);
  serverUrlNoAuth.username = '';
  serverUrlNoAuth.password = '';

  module.exports = {
    couchUrl: couchUrl.toString(),
    buildsUrl: BUILDS_URL || DEFAULT_BUILDS_URL,
    serverUrl: serverUrl.toString(),
    serverUrlNoAuth: serverUrlNoAuth.toString(),
    protocol: parsedUrl.protocol,
    port: parsedUrl.port,
    host: parsedUrl.hostname,
    db: parsedUrl.pathname.replace('/', ''),
    ddoc: 'medic',
    username: parsedUrl.username,
    password: parsedUrl.password,
    proxies: {
      // See http-proxy (https://www.npmjs.com/package/http-proxy#options) 
      // "changeOrigin: true/false, Default: false - changes the origin of the host header to the target URL"
      // This allows proxying from HTTP to HTTPS without encountering certificate issues 
      // for environments where TLS termination happens elsewhere.
      changeOrigin: isTrue(PROXY_CHANGE_ORIGIN)
    }
  };
} else {
  logger.error(
    'Please define a COUCH_URL in your environment e.g. \n' +
      'export COUCH_URL=\'http://admin:123qwe@localhost:5984/medic\'\n\n' +
      'If you are running unit tests use UNIT_TEST_ENV=1 in your environment.\n'
  );
  process.exit(1);
}

module.exports.buildPath = path.join(__dirname, '..', 'build');
module.exports.staticPath = path.join(module.exports.buildPath, 'static');
module.exports.webappPath = path.join(module.exports.staticPath, 'webapp');
module.exports.loginPath = path.join(module.exports.staticPath, 'login');
module.exports.templatePath = path.join(__dirname, '..', 'src', 'templates');
module.exports.defaultDocsPath = path.join(module.exports.buildPath, 'default-docs');
module.exports.ddocsPath = path.join(module.exports.buildPath, 'ddocs');
module.exports.resourcesPath = path.join(__dirname, '..', 'resources');
module.exports.isTesting = module.exports.db === 'medic-test';
