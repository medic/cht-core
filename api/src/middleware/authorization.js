const auth = require('../auth');
const serverUtils = require('../server-utils');

const FIREWALL_ERROR = {
  code: 403,
  error: 'forbidden',
  details: 'Offline users are not allowed access to this endpoint'
};

const getUserSettings = (req) => {
  return auth
    .getUserSettings(req.userCtx)
    .then(userCtx => {
      req.userCtx = userCtx;
    })
    .catch(err => err);
};

module.exports = {
  // saves CouchDB _session information as `userCtx` in the `req` object
  getUserCtx: (req, res, next) => {
    return auth
      .getUserCtx(req)
      .then(userCtx => {
        req.userCtx = userCtx;
        req.replicationId = req.headers['medic-replication-id'];
      })
      .catch(err => {
        req.authErr = err;
      })
      .then(next);
  },

  handleAuthErrors: (req, res, next) => {
    if (req.authErr) {
      return serverUtils.error(req.authErr, req, res);
    }

    if (!req.userCtx) {
      return serverUtils.error('Authentication error', req, res);
    }

    next();
  },

  handleAuthErrorsAllowingAuthorized: (req, res, next) => {
    if (req.authorized) {
      return next();
    }

    return module.exports.handleAuthErrors(req, res, next);
  },

  // blocks offline users not-authorized requests
  offlineUserFirewall: (req, res, next) => {
    if (req.userCtx && !auth.isOnlineOnly(req.userCtx) && !req.authorized) {
      res.status(FIREWALL_ERROR.code);
      return res.json(FIREWALL_ERROR);
    }
    next();
  },

  // proxies unauthenticated requests to CouchDB
  // proxies online users requests to CouchDB
  // saves offline user-settings doc in the request object
  onlineUserProxy: (proxy, req, res, next) => {
    if (!req.userCtx || auth.isOnlineOnly(req.userCtx)) {
      return proxy.web(req, res);
    }

    return getUserSettings(req).then(next);
  },

  // online users requests pass through to the next route, skipping other middleware in the stack
  // saves offline user-settings doc in the request object
  // used for audited endpoints
  onlineUserPassThrough: (req, res, next) => {
    if (auth.isOnlineOnly(req.userCtx)) {
      return next('route');
    }

    return getUserSettings(req).then(next);
  },

  // sets the authorized flag for a request. authorized requests may pass through the firewall.
  setAuthorized: (req, res, next) => {
    req.authorized = true;
    next();
  },

  getUserSettings: (req, res, next) => {
    if (auth.isOnlineOnly(req.userCtx)) {
      return next();
    }

    return getUserSettings(req).then(next);
  }
};
