var path = require('path'),
    url = require('url'),
    nano = require('nano');

var couchUrl = process.env.COUCH_URL;

var sanitizeResponse = function(err, body, headers, callback) {
  // Remove the `uri` and `statusCode` headers passed in from nano.  This
  // could potentially leak auth information to the client.  See
  // https://github.com/dscape/nano/blob/master/lib/nano.js#L195
  // TODO: open issue in nano project and patch
  var denyHeaders = ['uri', 'statuscode'];
  for (var k in headers) {
    if (denyHeaders.indexOf(k.toLowerCase()) >= 0) {
        delete headers[k];
    }
  }
  callback(err, body, headers);
};

if (couchUrl) {
  var parsedUrl = url.parse(couchUrl);

  module.exports = nano(couchUrl.substring(0, couchUrl.indexOf('/', 10)));
  module.exports.medic = nano(couchUrl);

  module.exports.settings = {
    protocol: parsedUrl.protocol,
    port: parsedUrl.port,
    host: parsedUrl.hostname,
    db: parsedUrl.path.replace('/',''),
    ddoc: 'medic'
  };

  if (parsedUrl.auth) {
    var index = parsedUrl.auth.indexOf(':');
    module.exports.settings.username = parsedUrl.auth.substring(0, index);
    module.exports.settings.password = parsedUrl.auth.substring(index + 1);
  }

  module.exports.fti = function(index, data, cb) {
    var url = path.join('_fti/local', module.exports.settings.db,
                        '_design', module.exports.settings.ddoc, index);
    if (data.q && !data.limit) {
      data.limit = 1000;
    }
    var opts = {path: url};
    if (data.q) {
      opts.method = 'post';
      opts.form = data;
    } else {
      opts.qs = data;
    }
    module.exports.request(opts, function(err, result) {
      if (err) {
        // the request itself failed
        return cb(err);
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
  module.exports.sanitizeResponse = sanitizeResponse;
} else if (process.env.TEST_ENV) {
  // Running tests only
  module.exports = {
    fti: function() {},
    request: function() {},
    getPath: function() {},
    settings: {},
    sanitizeResponse: sanitizeResponse,
    medic: {
      view: function() {},
      attachment: {
        get: function() {}
      },
      get: function() {},
      insert: function() {},
      updateWithHandler: function() {}
    }
  };
} else {
  console.log(
    "Please define a COUCH_URL in your environment e.g. \n" +
    "export COUCH_URL='http://admin:123qwe@localhost:5984/medic'\n\n" +
    "If you are running tests use TEST_ENV=1 in your environment.\n"
  );
  process.exit(1);
}
