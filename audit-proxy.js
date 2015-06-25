var EventEmitter = require('events').EventEmitter,
    util = require('util'),
    passStream = require('pass-stream'),
    auth = require('./auth'),
    db = require('./db'),
    couchdbAudit = require('couchdb-audit');

module.exports = AuditProxy;
util.inherits(AuditProxy, EventEmitter);

function AuditProxy() {
  if (!(this instanceof AuditProxy)) {
    return new AuditProxy();
  }
}

var parse = function(data) {
  try {
    return JSON.parse(data);
  } catch(e) {}
};

/**
 * Audits the request before proxying it on.
 *
 * @name onMatch(proxy, req, res)
 * @param proxy The proxy itself
 * @param res The http request object
 * @param req The http response object
 * @api public
 */
AuditProxy.prototype.audit = function(proxy, req, res) {

  var self = this;

  auth.check(req, 'can_edit', null, function(err, ctx) {
    if (err || !ctx || !ctx.user) {
      self.emit('not-authorized');
      return;
    }

    var dataBuffer = [];

    var writeFn = function(data, encoding, cb) {
      dataBuffer.push(data);
      cb();
    };

    var endFn = function(cb) {
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

      couchdbAudit
        .withNano(db, db.settings.db, db.settings.ddoc, ctx.user)
        .log(doc.docs || [doc], function(err) {
          if (err) {
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
    };

    var ps = passStream(writeFn, endFn);
    var buffer = req.pipe(ps);
    buffer.on('error', function(e) {
      console.log('ERROR', e);
      self.emit('error', e);
    });
    buffer.destroy = function() {};
  });

};

/**
 * Exposed for testing
 */
AuditProxy.prototype.setup = function(deps) {
  passStream = deps.passStream;
  db = deps.db;
  couchdbAudit = deps.audit;
  auth = deps.auth;
};
