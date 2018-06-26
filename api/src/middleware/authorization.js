const auth = require('../auth'),
      serverUtils = require('../server-utils');

const FIREWALL_ERROR = {
  code: 403,
  error: 'forbidden',
  details: 'Offline users are not allowed access to this endpoint'
};

module.exports = {
  // authorization for `_compact`, `_view_cleanup`, `_revs_limit` endpoints is handled by CouchDB
  ONLINE_ONLY_ENDPOINTS: [
    '_design/*/_list/*',
    '_design/*/_show/*',
    '_design/*/_view/*',
    '_find(/*)?',
    '_explain(/*)?',
    '_index(/*)?',
    '_ensure_full_commit(/*)?',
    '_security(/*)?',
    '_purge(/*)?'
  ],

  // saves CouchDB session `userCtx` into `req` object for later use
  // does not err when not logged in
  getUserCtx: (req, res, next) => {
    return auth
      .getUserCtx(req)
      .then(userCtx => {
        req.userCtx = userCtx;
        next();
      })
      .catch(() => next());
  },

  // blocks unauthenticated requests from passing through
  authenticated: (req, res, next) => {
    if (!req.userCtx) {
      return serverUtils.notLoggedIn(req, res);
    }
    next();
  },

  // blocks offline users from accessing online-only endpoints
  offlineUserFirewall: (req, res, next) => {
    if (!auth.isOnlineOnly(req.userCtx) && !req.authorized) {
      res.status(FIREWALL_ERROR.code);
      return res.json(FIREWALL_ERROR);
    }
    next();
  },

  // proxies all online users requests to CouchDB
  // saves offline user settings in the request object to be used later
  onlineUserProxy: (proxy, req, res, next) => {
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
    if (auth.isOnlineOnly(req.userCtx)) {
      return next('route');
    }

    return auth
      .getUserSettings(req.userCtx)
      .then(userCtx => {
        req.userCtx = userCtx;
        next();
      });
  }
};
