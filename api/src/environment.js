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
  module.exports.isTesting = true;
}

module.exports.initialize = async () => {
  if (!UNIT_TEST_ENV && !COUCH_URL) {
    throw new Error(
      'Please define a COUCH_URL in your environment e.g. \n' +
      'export COUCH_URL=\'http://admin:123qwe@localhost:5984/medic\'\n\n' +
      'If you are running unit tests use UNIT_TEST_ENV=1 in your environment.\n'
    );
  }
  const username = 'cht-api';
  const { serverUrl, couchUrl, dbName } = await serverChecks.getServerUrls(username);

  module.exports.serverUrl = serverUrl;
  module.exports.couchUrl = couchUrl;
  module.exports.db = dbName;

  const url = new URL(serverUrl);
  module.exports.protocol = url.protocol;
  module.exports.port = url.port;
  module.exports.host = url.hostname;
  module.exports.username = url.username;
  module.exports.password = url.password;

  module.exports.isTesting = dbName === 'medic-test';
};

module.exports.buildPath = path.join(__dirname, '..', 'build');
module.exports.staticPath = path.join(module.exports.buildPath, 'static');
module.exports.webappPath = path.join(module.exports.staticPath, 'webapp');
module.exports.loginPath = path.join(module.exports.staticPath, 'login');
module.exports.defaultDocsPath = path.join(module.exports.buildPath, 'default-docs');
module.exports.ddocsPath = path.join(module.exports.buildPath, 'ddocs');
module.exports.resourcesPath = path.join(__dirname, '..', 'resources');
