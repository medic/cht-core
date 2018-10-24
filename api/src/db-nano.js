/*************************************************
 *          !!! DEPRECATION WARNING !!!          *
 * Please use db-pouch in preference to db-nano! *
 *          !!! DEPRECATION WARNING !!!          *
 *************************************************/

var path = require('path'),
  url = require('url'),
  nano = require('nano');

const { COUCH_URL, UNIT_TEST_ENV } = process.env,
  logger = require('./logger');

if (UNIT_TEST_ENV) {
  // Running tests only
  module.exports = {
    fti: function() {},
    request: function() {},
    getPath: function() {},
    settings: {
      protocol: 'http',
      port: '123',
      host: 'local',
      db: 'medic',
      ddoc: 'medic',
    },
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

  module.exports.settings = {
    protocol: parsedUrl.protocol,
    port: parsedUrl.port,
    host: parsedUrl.hostname,
    db: dbName,
    auditDb: auditDbName,
    ddoc: 'medic',
  };

  if (parsedUrl.auth) {
    var index = parsedUrl.auth.indexOf(':');
    module.exports.settings.username = parsedUrl.auth.substring(0, index);
    module.exports.settings.password = parsedUrl.auth.substring(index + 1);
  }

  module.exports.getPath = function() {
    return path.join(
      module.exports.settings.db,
      '_design',
      module.exports.settings.ddoc,
      '_rewrite'
    );
  };
  module.exports.getCouchDbVersion = function(cb) {
    db.request({}, function(err, body) {
      if (err) {
        return cb(err);
      }
      var semvers = body.version && body.version.match(/(\d+)\.(\d+)\.(\d+)/);

      cb(null, {
        major: semvers[1],
        minor: semvers[2],
        patch: semvers[3],
      });
    });
  };
} else {
  logger.info(
    'Please define a COUCH_URL in your environment.\n' +
      'If you are running unit tests use UNIT_TEST_ENV=1 in your environment.\n'
  );
}
