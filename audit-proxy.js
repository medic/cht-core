var passStream = require('pass-stream'),
    auth = require('./auth'),
    db = require('./db'),
    couchdbAudit = require('couchdb-audit');

var parse = function(data) {
  try {
    return JSON.parse(data);
  } catch(e) {}
};

var audit = function(req, doc, cb) {
  var audit = couchdbAudit.withNode(db, function(_cb) {
    auth.getUserCtx(req, function(err, ctx) {
      _cb(err, ctx && ctx.name);
    })
  });
  audit.log([doc], cb);
};

module.exports = {

  /**
   * Audits the request before proxying it on.
   * 
   * @name onMatch(proxy, req, res)
   * @param proxy The proxy itself
   * @param res The http request object
   * @param req The http response object
   * @api public
   */
  onMatch: function(proxy, req, res) {

    var dataBuffer = [];

    function writeFn(data, encoding, cb) {
      dataBuffer.push(data);
      cb();
    }

    function endFn(cb) {
      var self = this;
      var options = { buffer: buffer };
      var data = dataBuffer.join('');
      var doc = parse(data);
      if (!doc) {
        // ignore non-json requests
        proxy.web(req, res, options);
        self.push(data);
        return cb();
      }

      audit(req, doc, function(err) {
        if (err) {
          console.log('error: ' + err);
          return cb(err);
        }
        data = JSON.stringify(doc);
        // audit might modify the doc (eg: generating an id)
        // so we need to update the content-length header
        req.headers['content-length'] = Buffer.byteLength(data);
        proxy.web(req, res, options);
        self.push(data);
        return cb();
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
    auth = deps.auth;
  }

}