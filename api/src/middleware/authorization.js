const auth = require('../auth'),
      serverUtils = require('../server-utils');

const FIREWALL_ERROR = {
  code: 403,
  error: 'forbidden',
  details: 'Offline users are not allowed access to this endpoint'
};

module.exports = {
  // saves CouchDB _session information as `userCtx` in the `req` object
  getUserCtx: (req, res, next) => {
    return auth
      .getUserCtx(req)
      .then(userCtx => {
        req.userCtx = userCtx;
        next();
      })
      .catch(err => {
        req.authErr = err;
        next();
      });
  },

  // blocks unauthenticated requests from passing through
  requireAuthenticatedUser: (req, res, next) => {
    if (!req.userCtx) {
      return serverUtils.notLoggedIn(req, res);
    }
    next();
  },

  // blocks offline users from accessing online-only endpoints
  offlineUserFirewall: (req, res, next) => {
    if (!req.userCtx) {
      return serverUtils.notLoggedIn(req, res);
    }

    if (!auth.isOnlineOnly(req.userCtx) && !req.authorized) {
      res.status(FIREWALL_ERROR.code);
      return res.json(FIREWALL_ERROR);
    }
    next();
  },

  // proxies all online users requests to CouchDB
  // saves offline user settings in the request object to be used later
  onlineUserProxy: (proxy, req, res, next) => {
    if (!req.userCtx) {
      return serverUtils.notLoggedIn(req, res);
    }

    if (auth.isOnlineOnly(req.userCtx)) {
      return proxy.web(req, res);
    }

    return auth
      .getUserSettings(req.userCtx)
      .then(userCtx => {
        req.userCtx = userCtx;
        next();
      });
  },

  // online users requests pass through to the next route (other middleware in this stack is skipped)
  // saves offline user settings in the request object to be used later
  // used for audited endpoints
  onlineUserPassThrough:(req, res, next) => {
    if (!req.userCtx) {
      return serverUtils.notLoggedIn(req, res);
    }

    if (auth.isOnlineOnly(req.userCtx)) {
      return next('route');
    }

    return auth
      .getUserSettings(req.userCtx)
      .then(userCtx => {
        req.userCtx = userCtx;
        next();
      });
  },

  // sets the authorized flag for a request
  // these requests will be allowed to pass through to AuditProxy
  setAuthorized: (req, res, next) => {
    req.authorized = true;
    next();
  }
};
