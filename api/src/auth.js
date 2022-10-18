const request = require('request-promise-native');
const url = require('url');
const _ = require('lodash');
const db = require('./db');
const environment = require('./environment');
const config = require('./config');
/**
 * this role is used in webapp bootstrap and session service to mainly determine whether the user should
 * replicate or not, without requiring access to server settings.
 */
const ONLINE_ROLE = 'mm-online';
const DB_ADMIN_ROLE = '_admin';

const get = (path, headers) => {
  const dbUrl = url.parse(environment.serverUrl);
  const fullUrl = url.format({
    protocol: dbUrl.protocol,
    host: dbUrl.host,
    pathname: path
  });
  return request.get({
    url: fullUrl,
    headers: headers,
    json: true
  });
};

// TODO Use a shared library for this duplicated code #4021
const hasRole = (userCtx, role) => {
  return _.includes(userCtx && userCtx.roles, role);
};

const isDbAdmin = userCtx => hasRole(userCtx, DB_ADMIN_ROLE);

const hasPermission = (userCtx, permission) => {
  const roles = config.get('permissions')[permission];
  if (!roles) {
    return false;
  }
  return _.some(roles, role => _.includes(userCtx.roles, role));
};

const hydrateUserSettings = (userSettings) => {
  return db.medic
    .allDocs({ keys: [ userSettings.facility_id, userSettings.contact_id ], include_docs: true })
    .then((response) => {
      if (!Array.isArray(response.rows) || response.rows.length !== 2) { // malformed response
        return userSettings;
      }

      const [facilityRow, contactRow] = response.rows;
      if (!facilityRow || !contactRow) { // malformed response
        return userSettings;
      }

      userSettings.facility = facilityRow.doc;
      userSettings.contact = contactRow.doc;

      return userSettings;
    });
};

module.exports = {
  hasOnlineRole: roles => {
    if (!Array.isArray(roles) || !roles.length) {
      return false;
    }

    const onlineRoles = [
      DB_ADMIN_ROLE,
      ONLINE_ROLE,
      'national_admin', // kept for backwards compatibility
    ];
    return roles.some(role => onlineRoles.includes(role));
  },

  isOnlineOnly: userCtx => {
    return userCtx && module.exports.hasOnlineRole(userCtx.roles);
  },

  isOffline: roles => {
    const configured = config.get('roles') || {};
    const configuredRole = roles.some(role => configured[role]);
    return !isDbAdmin({ roles }) &&
           (!configuredRole || roles.some(role => configured[role] && configured[role].offline));
  },

  hasAllPermissions: (userCtx, permissions) => {
    if (isDbAdmin(userCtx)) {
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
    const dbUrl = url.parse(environment.serverUrl);
    const fullUrl = url.format({
      protocol: dbUrl.protocol,
      host: dbUrl.host,
      pathname: req.params.path
    });
    return request.head({
      url: fullUrl,
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
    const authUrl = url.parse(process.env.COUCH_URL);
    delete authUrl.pathname;
    authUrl.auth = `${username}:${password}`;

    return request.head({
      uri: url.format(authUrl),
      resolveWithFullResponse: true
    })
      .then(res => {
        if (res.statusCode !== 200) {
          return Promise.reject(new Error(`Expected 200 got ${res.statusCode}`));
        }
        return username;
      });
  },

  getUserSettings: userCtx => {
    return Promise
      .all([
        db.users.get('org.couchdb.user:' + userCtx.name),
        db.medic.get('org.couchdb.user:' + userCtx.name)
      ])
      .then(([ user, medicUser ]) => {
        Object.assign(medicUser, _.pick(user, 'name', 'roles', 'facility_id'));
        return hydrateUserSettings(medicUser);
      });
  },

  isDbAdmin: isDbAdmin,
  ONLINE_ROLE: ONLINE_ROLE,
};
