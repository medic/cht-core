const path = require('path');
const url = require('url');
const logger = require('./logger');

const { UNIT_TEST_ENV, COUCH_URL, MEDIC_API_RESOURCE_PATH, NODE_ENV } = process.env;

if (UNIT_TEST_ENV) {
  module.exports = {
    serverUrl: '',
    db: '',
    ddoc: '',
    couchUrl: '',
    port: '',
    host: '',
    protocol: '',
  };
} else if (COUCH_URL) {
  // strip trailing slash from to prevent bugs in path matching
  const couchUrl = COUCH_URL.replace(/\/$/, '');
  const parsedUrl = url.parse(couchUrl);

  module.exports = {
    couchUrl: couchUrl,
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

let deployInfo;
module.exports.setDeployInfo = newDeployInfo => {
  deployInfo = newDeployInfo;
};

module.exports.getDeployInfo = () => deployInfo;

module.exports.getExtractedResourcesPath = () => {
  let destination = MEDIC_API_RESOURCE_PATH;
  if (!destination) {
    const isProduction = NODE_ENV === 'production';
    const defaultLocation = path.join(__dirname, '..', 'extracted-resources');
    destination = isProduction ? '/tmp/extracted-resources' : defaultLocation;
  }

  return path.resolve(destination);
};

module.exports.isTesting = module.exports.db === 'medic-test';
