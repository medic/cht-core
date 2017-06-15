var path = require('path'),
    url = require('url'),
    nano = require('nano'),
    request = require('request'),
    async = require('async');

var couchUrl = process.env.COUCH_URL;
var luceneUrl = process.env.LUCENE_URL;

var sanitizeResponse = function(err, body, headers, callback) {
  // Remove the `uri` and `statusCode` headers passed in from nano.  This
  // could potentially leak auth information to the client.  See
  // https://github.com/dscape/nano/issues/311
  var denyHeaders = ['uri', 'statuscode'];
  for (var k in headers) {
    if (denyHeaders.indexOf(k.toLowerCase()) >= 0) {
        delete headers[k];
    }
  }
  callback(err, body, headers);
};

if (couchUrl) {
  // strip trailing slash from to prevent bugs in path matching
  couchUrl = couchUrl.replace(/\/$/, '');
  var baseUrl = couchUrl.substring(0, couchUrl.indexOf('/', 10));
  var parsedUrl = url.parse(couchUrl);
  var dbName = parsedUrl.path.replace('/','');
  var auditDbName = dbName + '-audit';
  var db = nano(baseUrl);

  // Default configuration runs lucene on the same server at port 5985
  luceneUrl = luceneUrl || baseUrl.replace('5984', '5985');

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
    ddoc: 'medic'
  };

  if (parsedUrl.auth) {
    var index = parsedUrl.auth.indexOf(':');
    module.exports.settings.username = parsedUrl.auth.substring(0, index);
    module.exports.settings.password = parsedUrl.auth.substring(index + 1);
  }

  module.exports.fti = function(index, data, cb) {
    var url = luceneUrl + '/' + path.join('local', module.exports.settings.db,
                                          '_design', module.exports.settings.ddoc,
                                          index);

    if (data.q && !data.limit) {
      data.limit = 1000;
    }
    var opts = { url: url };
    if (data.q) {
      opts.method = 'post';
      opts.form = data;
    } else {
      opts.qs = data;
    }

    request(opts, function(err, response, result) {
      if (err) {
        // the request itself failed
        return cb(err);
      }

      try {
        result = JSON.parse(result);
      } catch (e) {
        return cb(e);
      }

      if (data.q && !result.rows) {
        // the query failed for some reason
        return cb(result);
      }
      cb(null, result);
    });
  };
  module.exports.getPath = function() {
    return path.join(module.exports.settings.db, '_design',
                     module.exports.settings.ddoc, '_rewrite');
  };
  module.exports.getSettings = function(cb) {
    var uri = path.join(module.exports.getPath(), 'app_settings',
                        module.exports.settings.ddoc);
    module.exports.request({ path: uri }, cb);
  };
  module.exports.updateSettings = function(updates, cb) {
    var uri = path.join(module.exports.getPath(), 'update_settings',
                        module.exports.settings.ddoc);
    module.exports.request({ path: uri, method: 'put', body: updates }, cb);
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
        patch: semvers[3]
      });
    });
  };

  module.exports.sanitizeResponse = sanitizeResponse;

  const runBatch = (query, iteratee, batchSize, skip, callback) => {
    query(skip, (err, response) => {
      if (err) {
        return callback(err);
      }
      console.log(`        Processing ${skip} to ${skip + batchSize} docs of ${response.total_rows} total`);
      iteratee(response, err => {
        const keepGoing = response.total_rows > (skip + batchSize);
        callback(err, keepGoing);
      });
    });
  };

  /**
   * Run an operation over all documents returned from the query in batches.
   *
   * query function     Called with a skip number and a callback to
   *                    invoke with the next batch.
   * iteratee function  Called with the query response and a callback to
   *                    invoke when rows have been processed and persisted.
   * batchSize int      The size each batch should be.
   * callback function  Called when no more rows are returned from the
   *                    query function.
   */
  module.exports.batch = (query, iteratee, batchSize, callback) => {
    let skip = 0;
    async.doWhilst(
      callback => runBatch(query, iteratee, batchSize, skip, callback),
      keepGoing => {
        skip += batchSize;
        return keepGoing;
      },
      callback
    );
  };
} else if (process.env.UNIT_TEST_ENV) {
  // Running tests only
  module.exports = {
    fti: function() {},
    request: function() {},
    getPath: function() {},
    settings: {
      protocol: 'http',
      port: '123',
      host: 'local',
      db: 'medic'
    },
    getSettings: function() {},
    updateSettings: function() {},
    sanitizeResponse: sanitizeResponse,
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
        get: function() {}
      }
    },
    audit: {
      view: function() {},
      list: function() {}
    },
    db: {
      get: function() {},
      create: function() {},
      replicate:  function() {}
    },
    _users: {
      get: function() {},
      list: function() {},
      insert: function() {}
    }
  };
} else {
  console.log(
    'Please define a COUCH_URL in your environment e.g. \n' +
    'export COUCH_URL=\'http://admin:123qwe@localhost:5984/medic\'\n\n' +
    'If you are running unit tests use UNIT_TEST_ENV=1 in your environment.\n'
  );
}
