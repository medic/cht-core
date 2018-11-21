/*************************************************
 *          !!! DEPRECATION WARNING !!!          *
 * Please use db-pouch in preference to db-nano! *
 *          !!! DEPRECATION WARNING !!!          *
 *************************************************/

var url = require('url'),
  nano = require('nano');

const { COUCH_URL, UNIT_TEST_ENV } = process.env,
  logger = require('./logger');

if (UNIT_TEST_ENV) {
  // Running tests only
  module.exports = {
    fti: function() {},
    request: function() {},
    use: function() {},
    medic: {
      view: function() {},
      get: function() {},
      insert: function() {},
      updateWithHandler: function() {},
      fetch: function() {},
      fetchRevs: function() {},
      bulk: function() {},
      changes: function() {},
      attachment: {
        get: function() {},
      },
    },
    audit: {
      view: function() {},
      list: function() {},
    },
    db: {
      get: function() {},
      create: function() {},
      replicate: function() {},
    },
    _users: {
      get: function() {},
      list: function() {},
      insert: function() {},
    },
  };
} else if (COUCH_URL) {
  // strip trailing slash from to prevent bugs in path matching
  const couchUrl = COUCH_URL.replace(/\/$/, '');
  var baseUrl = couchUrl.substring(0, couchUrl.indexOf('/', 10));
  var parsedUrl = url.parse(couchUrl);
  var dbName = parsedUrl.path.replace('/', '');
  var auditDbName = dbName + '-audit';
  var db = nano(baseUrl);

  module.exports = db;
  module.exports.medic = db.use(dbName);
  module.exports.audit = db.use(auditDbName);
  module.exports._users = db.use('_users');
} else {
  logger.info(
    'Please define a COUCH_URL in your environment.\n' +
      'If you are running unit tests use UNIT_TEST_ENV=1 in your environment.\n'
  );
}
