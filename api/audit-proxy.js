var EventEmitter = require('events').EventEmitter,
    util = require('util'),
    passStream = require('pass-stream'),
    _ = require('underscore'),
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

    var audit = function(doc, cb) {
      if (!doc) {
        // don't audit non-json requests
        return cb(null, dataBuffer);
      }

      var docs = doc.docs || [ doc ];
      docs = _.reject(docs, function(doc) {
        return doc._id && doc._id.indexOf('_local/') === 0;
      });
      if (!docs.length) {
        // don't audit requests without auditable docs
        return cb(null, dataBuffer);
      }

      couchdbAudit
        .withNano(db, db.settings.db, db.settings.auditDb, db.settings.ddoc, ctx.user)
        .log(docs, function(err) {
          if (err) {
            return cb(err);
          }
          var data = JSON.stringify(doc);
          // audit might modify the doc (eg: generating an id)
          // so we need to update the content-length header
          req.headers['content-length'] = Buffer.byteLength(data);
          cb(null, [ data ]);
        });
    };

    var endFn = function(cb) {
      var self = this;
      var options = { buffer: buffer };
      var doc = parse(Buffer.concat(dataBuffer).toString());
      audit(doc, function(err, data) {
        if (err) {
          return cb(err);
        }
        // proxy the request through to the app as if nothing happened
        proxy.web(req, res, options);
        data.forEach(self.push, self);
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
