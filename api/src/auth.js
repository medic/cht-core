const request = require('@medic/couch-request');
const _ = require('lodash');
const db = require('./db');
const environment = require('@medic/environment');
const config = require('./config');
const dataContext = require('./services/data-context');
const { roles, users } = require('@medic/user-management')(config, db, dataContext);
const {PermissionError} = require('./errors');
const contentLengthRegex = /^content-length$/i;
const contentTypeRegex = /^content-type$/i;

const get = (path, headers) => {
  const getHeaders = { ...headers };
  Object
    .keys(getHeaders)
    .filter(header => contentLengthRegex.test(header) || contentTypeRegex.test(header))
    .forEach(header => delete getHeaders[header]);

  const url = new URL(path, environment.serverUrlNoAuth);
  return request.get({
    url: url.toString(),
    headers: getHeaders,
    json: true
  });
};

const getUserCtx = req => {
  return get('/_session', req.headers)
    .catch(err => {
      if (err.status === 401) {
        throw { code: 401, message: 'Not logged in', err: err };
      }
      throw err;
    })
    .then(auth => {
      if (auth?.userCtx?.name) {
        req.headers['X-Medic-User'] = auth.userCtx.name;
        return auth.userCtx;
      }
      throw { code: 500, message: 'Failed to authenticate' };
    });
};

const hasAllPermissions = (userCtx, permissions) => {
  if (roles.isDbAdmin(userCtx)) {
    return true;
  }
  if (!permissions || !userCtx || !userCtx.roles) {
    return false;
  }
  if (!_.isArray(permissions)) {
    permissions = [ permissions ];
  }
  return _.every(permissions, _.partial(hasPermission, userCtx));
};

const hasPermission = (userCtx, permission) => {
  const roles = config.get('permissions')[permission];
  if (!roles) {
    return false;
  }
  return _.some(roles, role => _.includes(userCtx.roles, role));
};

const checkUserPermissions = async (req, permissions = ['can_view_contacts'], altPermissions = []) => {
  const userCtx = await getUserCtx(req);
  const isOnlineUser = roles.isOnlineOnly(userCtx);
  const hasPrimaryPermissions = hasAllPermissions(userCtx, permissions);
  const hasAlternativePermissions = altPermissions.length > 0 && hasAllPermissions(userCtx, altPermissions);

  if (!isOnlineUser || (!hasPrimaryPermissions && !hasAlternativePermissions)) {
    throw new PermissionError('Insufficient privileges');
  }
};

module.exports = {
  isOnlineOnly: roles.isOnlineOnly,
  isDbAdmin: roles.isDbAdmin,
  getUserSettings: users.getUserSettings,
  hasAllPermissions,
  getUserCtx,
  check: (req, permissions) => {
    return module.exports
      .getUserCtx(req)
      .then(userCtx => {
        if (!module.exports.hasAllPermissions(userCtx, permissions)) {
          throw { code: 403, message: 'Insufficient privileges' };
        }
        return userCtx;
      });
  },
  checkUserPermissions,

  /**
   * Extract Basic Auth credentials from a request
   *
   * @param      {Object}  req     The request
   * @return     {Object}  {username: username, password: password}
   */
  basicAuthCredentials: req => {
    const authHeader = req?.headers?.authorization;
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return false;
    }
    try {
      const [username, password] = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
      return { username, password };
    } catch {
      throw Error('Corrupted Auth header');
    }
  },

  /**
   * Validates given Basic Auth credentials against the server
   *
   * @param      {Object}    Credentials object as created by basicAuthCredentials
   */
  validateBasicAuth: ({ username, password }) => {
    return request
      .get({
        uri: environment.serverUrlNoAuth,
        auth: { username, password },
        simple: false,
        json: false,
      })
      .then(res => {
        if (!res.ok) {
          return Promise.reject(new Error(`Expected 200 got ${res.status}`));
        }
        return username;
      });
  },
};
