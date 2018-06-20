const auth = require('../auth'),
      serverUtils = require('../server-utils');

// authorization for `_compact`, `_view_cleanup`, `_revs_limit` endpoints is handled by CouchDB
module.exports.ONLINE_ONLY_ENDPOINTS = [
  '_design/*/_list/*',
  '_design/*/_show/*',
  '_design/*/_view/*',
  '_find(/*)?',
  '_explain(/*)?',
  '_index(/*)?',
  '_ensure_full_commit(/*)?',
  '_security(/*)?',
  '_purge(/*)?'
];

const OFFLINE_FIREWALL_RESPONSE = {
  code: 403,
  error: 'forbidden',
  details: 'Offline users are not allowed access to this enpoint'
};

module.exports.offlineFirewall = (req, res, next) => {
  auth
    .getUserCtx(req)
    .then(userCtx => {
      if (!auth.isOnlineOnly(userCtx)) {
        res.status(OFFLINE_FIREWALL_RESPONSE.code);
        return res.json(OFFLINE_FIREWALL_RESPONSE);
      }
      next();
    })
    .catch(next);
};

module.exports.onlineProxy = (proxy, req, res, next) => {
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
};

module.exports.onlinePassThrough = (req, res, next) => {
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
};
