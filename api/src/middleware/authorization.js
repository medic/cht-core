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

  // blocks offline users from accessing online-only endpoints
  offlineUserFirewall: (req, res, next) => {
    auth
      .getUserCtx(req)
      .then(userCtx => {
        if (!auth.isOnlineOnly(userCtx)) {
          res.status(FIREWALL_ERROR.code);
          return res.json(FIREWALL_ERROR);
        }
        next();
      })
      .catch(next);
  },

  // proxies all online users requests to CouchDB
  // saves offline user context in the request object to be used later
  onlineUserProxy: (proxy, req, res, next) => {
    return auth
      .getUserCtx(req)
      .then(userCtx => {
        if (auth.isOnlineOnly(userCtx)) {
          return proxy.web(req, res);
        }

        return auth
          .getUserSettings(userCtx)
          .then(userCtx => {
            req.userCtx = userCtx;
            next();
          });
      })
      .catch(() => serverUtils.notLoggedIn(req, res, false));
  },

  // online users requests pass through to the next route (other middleware in this stack is skipped)
  // saves offline user context in the request object to be used later
  // used for audited endpoints
  onlineUserPassThrough:(req, res, next) => {
    return auth
      .getUserCtx(req)
      .then(userCtx => {
        if (auth.isOnlineOnly(userCtx)) {
          return next('route');
        }

        return auth
          .getUserSettings(userCtx)
          .then(userCtx => {
            req.userCtx = userCtx;
            next();
          });
      })
      .catch(() => serverUtils.notLoggedIn(req, res, false));
  }
};
