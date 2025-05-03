const logger = require('@medic/logger');
const semver = require('semver');

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

let couchUrl;
let serverUrl;
let serverUrlNoAuth;

try {
  // strip trailing slash from to prevent bugs in path matching
  couchUrl = COUCH_URL.replace(/\/$/, '');
  const parsedUrl = new URL(couchUrl);
  serverUrl = new URL('/', parsedUrl);
  serverUrlNoAuth = new URL('/', parsedUrl);
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
} catch (err) {
  if (err.message === 'Invalid URL') {
    logError();
  }

  logger.error(err);
  process.exit(1);
}

let deployInfoCache;

const getVersionFromDdoc = (ddoc) => {
  return semver.valid(ddoc.build_info?.version) ||
    semver.valid(ddoc.deploy_info?.build) ||
    ddoc.version ||
    'unknown';
};

const getDeployInfo = async () => {
  if (deployInfoCache) {
    return deployInfoCache;
  }

  try {
    // Lazy load couch-request only when needed
    const request = require('@medic/couch-request');
    const ddoc = await request.get({
      url: `${couchUrl}/_design/${module.exports.ddoc}`,
      headers:{
        'user-agent': 'Community Health Toolkit/4.18.0 (test-platform,test-arch)',
      }
    });
    deployInfoCache = {
      ...ddoc.build_info,
      ...ddoc.deploy_info,
      version: getVersionFromDdoc(ddoc)
    };
    return deployInfoCache;
  } catch (err) {
    logger.error('Error getting deploy info: %o', err);
    throw err;
  }
};

const getVersion = async () => {
  try {
    const deployInfo = await getDeployInfo();
    return deployInfo.version;
  } catch (err) {
    return 'unknown';
  }
};

module.exports.isTesting = module.exports.db === 'medic-test';
module.exports.getDeployInfo = getDeployInfo;
module.exports.getVersion = getVersion;
