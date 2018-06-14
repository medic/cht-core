const auth = require('../auth'),
      serverUtils = require('../server-utils');

module.exports.adminProxy = (proxy, req, res, next) => {
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

module.exports.adminPassThrough = (req, res, next) => {
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
