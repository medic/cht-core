var http = require('http'),
  passStream = require('pass-stream'),
  db = require('./db'),
  couchdbAudit = require('couchdb-audit');

var getUsername = function(req, cb) {
  http.get({
    host: db.client.host,
    port: db.client.port,
    path: '/_session',
    headers: req.headers
  }, function(res) {
    res
      .on('data', function (chunk) {
        cb(null, JSON.parse(chunk).userCtx.name);
      })
      .on('error', function(e) {
        cb(e);
      });
  });
};

module.exports = {

  /**
   * Tests the given request to determine if this proxy should be applied.
   * 
   * @name filter(req)
   * @param req The http request object to test
   * @api public
   */
  filter: function(req) {
    return req.url.indexOf(db.name) === 0 
        && ['PUT','POST','DELETE'].indexOf(req.method) !== -1
  },

  /**
   * Audits the request before proxying it on to the target.
   * 
   * @name onMatch(proxy, req, res, target)
   * @param proxy The proxy itself
   * @param res The http request object
   * @param req The http response object
   * @param target The target url to proxy the request on to
   * @api public
   */
  onMatch: function(proxy, req, res, target) {

    var audit = couchdbAudit.withNode(db, function(cb) {
      getUsername(req, cb);
    });
    var dataBuffer = '';

    function writeFn(data, encoding, cb) {
      // do not push data until audited
      dataBuffer += data;
      cb();
    }

    function endFn(cb) {
      var self = this;
      var doc = JSON.parse(dataBuffer);
      audit.log([doc], function(err) {
        if (!err) {
          var body = JSON.stringify(doc);
          proxy.web(req, res, {
            target: target, 
            buffer: buffer,
            // audit might modify the doc (eg: generating an id)
            // so we need to update the content-length header
            headers: {
              'content-length': Buffer.byteLength(body)
            }
          });
          self.push(body);
        }
        cb(err);
      });
    }

    var ps = passStream(writeFn, endFn);
    var buffer = req.pipe(ps);
    buffer.destroy = function() {};

  },

  /**
   * Exposed for testing
   */
  setup: function(deps) {
    passStream = deps.passStream;
    db = deps.db;
    couchdbAudit = deps.audit;
    http = deps.http;
  }

}