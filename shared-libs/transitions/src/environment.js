const url = require('url');
const logger = require('./lib/logger');

const { UNIT_TEST_ENV, API_PORT, COUCH_URL } = process.env;

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
    couchUrl,
    apiUrl: `http://localhost:${API_PORT || 5988}`,
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
