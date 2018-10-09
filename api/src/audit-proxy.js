var EventEmitter = require('events').EventEmitter,
  util = require('util'),
  passStream = require('pass-stream'),
  _ = require('underscore'),
  auth = require('./auth'),
  db = require('./db-nano');

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
  } catch (e) {}
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

  auth
    .check(req, 'can_edit')
    .then(ctx => {
      if (!ctx || !ctx.user) {
        self.emit('not-authorized');
        return;
      }
      proxy.web(req, res);
    })
    .catch(() => {
      self.emit('not-authorized');
    });
};

/**
 * Exposed for testing
 */
AuditProxy.prototype.setup = function(deps) {
  passStream = deps.passStream;
  db = deps.db;
  auth = deps.auth;
};
