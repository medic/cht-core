const path = require('path');
const url = require('url');
const logger = require('./logger');

const { UNIT_TEST_ENV, COUCH_URL, BUILDS_URL } = process.env;
const DEFAULT_BUILDS_URL = 'https://staging.dev.medicmobile.org/_couch/builds';

if (UNIT_TEST_ENV) {
  module.exports = {
    serverUrl: '',
    db: '',
    ddoc: '',
    couchUrl: '',
    port: '',
    host: '',
    protocol: '',
    buildsUrl: '',
  };
} else if (COUCH_URL) {
  // strip trailing slash from to prevent bugs in path matching
  const couchUrl = COUCH_URL.replace(/\/$/, '');
  const parsedUrl = url.parse(couchUrl);

  module.exports = {
    couchUrl: couchUrl,
    buildsUrl: BUILDS_URL || DEFAULT_BUILDS_URL,
    serverUrl: couchUrl.slice(0, couchUrl.lastIndexOf('/')),
    protocol: parsedUrl.protocol,
    port: parsedUrl.port,
    host: parsedUrl.hostname,
    db: parsedUrl.path.replace('/', ''),
    ddoc: 'medic',
  };
  if (parsedUrl.auth) {
    const index = parsedUrl.auth.indexOf(':');
    module.exports.username = parsedUrl.auth.substring(0, index);
    module.exports.password = parsedUrl.auth.substring(index + 1);
  }
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
