const path = require('path');
const serverChecks = require('@medic/server-checks');

const { UNIT_TEST_ENV, COUCH_URL, BUILDS_URL } = process.env;
const DEFAULT_BUILDS_URL = 'https://staging.dev.medicmobile.org/_couch/builds';

module.exports.buildsUrl = BUILDS_URL || DEFAULT_BUILDS_URL;
module.exports.ddoc = 'medic';

if (UNIT_TEST_ENV) {
  module.exports.couchUrl = '';
  module.exports.serverUrl = '';
  module.exports.protocol = '';
  module.exports.port = '';
  module.exports.host = '';
  module.exports.db = '';
  module.exports.username = '';
  module.exports.password = '';
}

const initialize = async () => {
  if (!UNIT_TEST_ENV && !COUCH_URL) {
    throw new Error(
      'Please define a COUCH_URL in your environment e.g. \n' +
      'export COUCH_URL=\'http://admin:123qwe@localhost:5984/medic\'\n\n' +
      'If you are running unit tests use UNIT_TEST_ENV=1 in your environment.\n'
    );
  }
  const username = 'cht-api';
  const { couchUrl, serverUrl, dbName } = await serverChecks.getServerUrls(username);

  module.exports.couchUrl = couchUrl.toString();
  module.exports.serverUrl = serverUrl.toString();
  module.exports.protocol = serverUrl.protocol;
  module.exports.port = serverUrl.port;
  module.exports.host = serverUrl.hostname;
  module.exports.db = dbName;
  module.exports.username = username;
  module.exports.password = serverUrl.password;
};

let deployInfo;
module.exports.setDeployInfo = (newDeployInfo = {}) => {
  deployInfo = newDeployInfo;
};

module.exports.getDeployInfo = () => deployInfo;
module.exports.buildPath = path.join(__dirname, '..', 'build');
module.exports.staticPath = path.join(module.exports.buildPath, 'static');
module.exports.webappPath = path.join(module.exports.staticPath, 'webapp');
module.exports.loginPath = path.join(module.exports.staticPath, 'login');
module.exports.defaultDocsPath = path.join(module.exports.buildPath, 'default-docs');
module.exports.ddocsPath = path.join(module.exports.buildPath, 'ddocs');
module.exports.upgradePath = path.join(module.exports.buildPath, 'upgrade');
module.exports.resourcesPath = path.join(__dirname, '..', 'resources');
module.exports.isTesting = module.exports.db === 'medic-test';
module.exports.initialize = initialize;
