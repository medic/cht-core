const request = require('request-promise-native');
const _ = require('lodash');
const db = require('./db');
const environment = require('./environment');
const config = require('./config');
const { roles, users } = require('@medic/user-management')(config, db);

const get = (path, headers) => {
  const url = new URL(path, environment.serverUrlNoAuth);
  return request.get({
    url: url.toString(),
    headers: headers,
    json: true
  });
};

const hasPermission = (userCtx, permission) => {
  const roles = config.get('permissions')[permission];
  if (!roles) {
    return false;
  }
  return _.some(roles, role => _.includes(userCtx.roles, role));
};

module.exports = {
  isOnlineOnly: roles.isOnlineOnly,
  isDbAdmin: roles.isDbAdmin,
  getUserSettings: users.getUserSettings,
  hasAllPermissions: (userCtx, permissions) => {
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
  },

  getUserCtx: req => {
    return get('/_session', req.headers)
      .catch(err => {
        if (err.statusCode === 401) {
          throw { code: 401, message: 'Not logged in', err: err };
        }
        throw err;
      })
      .then(auth => {
        if (auth && auth.userCtx && auth.userCtx.name) {
          req.headers['X-Medic-User'] = auth.userCtx.name;
          return auth.userCtx;
        }
        throw { code: 500, message: 'Failed to authenticate' };
      });
  },

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

  checkUrl: req => {
    if (!req.params || !req.params.path) {
      return Promise.reject(new Error('No path given'));
    }
    const dbUrl = new URL(req.params.path, environment.serverUrlNoAuth);
    return request.head({
      url: dbUrl.toString(),
      headers: req.headers,
      resolveWithFullResponse: true
    })
      .then(res => res && res.statusCode);
  },

  /**
   * Extract Basic Auth credentials from a request
   *
   * @param      {Object}  req     The request
   * @return     {Object}  {username: username, password: password}
   */
  basicAuthCredentials: req => {
    const authHeader = req && req.headers && req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return false;
    }

    let username;
    let password;

    try {
      [username, password] = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
    } catch (err) {
      throw Error('Corrupted Auth header');
    }

    return {
      username: username,
      password: password
    };
  },

  /**
   * Validates given Basic Auth credentials against the server
   *
   * @param      {Object}    Credentials object as created by basicAuthCredentials
   */
  validateBasicAuth: ({ username, password }) => {
    const authUrl = new URL(environment.serverUrlNoAuth);
    authUrl.username = username;
    authUrl.password = password;
    return request.head({
      uri: authUrl.toString(),
      resolveWithFullResponse: true
    })
      .then(res => {
        if (res.statusCode !== 200) {
          return Promise.reject(new Error(`Expected 200 got ${res.statusCode}`));
        }
        return username;
      });
  },
};
