const auth = require('../auth'),
      serverUtils = require('../server-utils');

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

const VIEW_MATCH_PERMISSIONS_MAP = {
  'contacts_by': ['can_access_contacts'],
  'messages_by': ['can_access_messages'],
  'reports_by': ['can_access_reports']
  // tasks? : ['can_access_tasks'],
  // users? : ['can_access_users']
};

module.exports = {
  // saves CouchDB _session information as `userCtx` in the `req` object
  getUserCtx: (req, res, next) => {
    return auth
      .getUserCtx(req)
      .then(userCtx => {
        req.userCtx = userCtx;
      })
      .catch(err => {
        req.authErr = err;
      })
      .then(next);
  },

  // blocks unauthenticated requests from passing through
  checkAuth: (req, res, next) => {
    if (!req.userCtx) {
      return serverUtils.notLoggedIn(req, res);
    }
    next();
  },

  // blocks offline users not-authorized requests
  offlineUserFirewall: (req, res, next) => {
    if (!auth.isOnlineOnly(req.userCtx) && !req.authorized) {
      res.status(FIREWALL_ERROR.code);
      return res.json(FIREWALL_ERROR);
    }
    next();
  },

  // enforces permissions for any */_view/* request
  viewsFirewall: (req, res, next) => {
    if(req.originalUrl.indexOf('/_view/') === -1) {
      next();
    } else {
      let matchingView = null;
      for(const view of Object.keys(VIEW_MATCH_PERMISSIONS_MAP)) {
        if(req.originalUrl.indexOf(view) !== -1) {
          matchingView = view;
          break;
        }
      }
      if(matchingView) {
        auth.check(req, VIEW_MATCH_PERMISSIONS_MAP[matchingView])
        .then(next)
        .catch(err => serverUtils.error(err, req, res));
      }
    }
  },

  // proxies online users requests to CouchDB
  // saves offline user-settings doc in the request object
  onlineUserProxy: (proxy, req, res, next) => {
    if (auth.isOnlineOnly(req.userCtx)) {
      return proxy.web(req, res);
    }

    return getUserSettings(req).then(next);
  },

  // online users requests pass through to the next route, skipping other middleware in the stack
  // saves offline user-settings doc in the request object
  // used for audited endpoints
  onlineUserPassThrough:(req, res, next) => {
    if (auth.isOnlineOnly(req.userCtx)) {
      return next('route');
    }

    return getUserSettings(req).then(next);
  },

  // sets the authorized flag for a request. authorized requests may pass through the firewall.
  setAuthorized: (req, res, next) => {
    req.authorized = true;
    next();
  }
};
