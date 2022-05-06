var request = require('request-promise-native'),
    url = require('url'),
    _ = require('underscore'),
    db = require('./db'),
    environment = require('./environment'),
    config = require('./config'),
    ONLINE_ROLE = 'mm-online';
// hello world
var get = (path, headers) => {
  const dbUrl = url.parse(environment.serverUrl);
  var fullUrl = url.format({
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
var hasRole = (userCtx, role) => {
  return _.contains(userCtx && userCtx.roles, role);
};

var isDbAdmin = userCtx => hasRole(userCtx, '_admin');

var hasPermission = (userCtx, permission) => {
  var roles = config.get('permissions')[permission];
  if (!roles) {
    return false;
  }
  return _.some(roles, role => _.contains(userCtx.roles, role));
};

var checkDistrict = (requested, permitted) => {
  if (!requested) {
    // limit to configured facility
    return permitted;
  }
  if (!permitted) {
    // national admin - give them what they want
    return requested;
  }
  if (requested === permitted) {
    // asking for the allowed facility
    return requested;
  }
  throw { code: 403, message: 'Insufficient privileges' };
};

const getFacilityId = (req, userCtx) => {
  var url = '/_users/org.couchdb.user:' + userCtx.name;
  return get(url, req.headers).then(user => user.facility_id);
};

module.exports = {
  isOnlineOnly: userCtx => {
    return hasRole(userCtx, '_admin') ||
           hasRole(userCtx, 'national_admin') || // kept for backwards compatibility
           hasRole(userCtx, ONLINE_ROLE);
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
        throw { code: 401, message: 'Not logged in', err: err };
      })
      .then(auth => {
        if (auth && auth.userCtx && auth.userCtx.name) {
          req.headers['X-Medic-User'] = auth.userCtx.name;
          return auth.userCtx;
        }
        throw { code: 401, message: 'Not logged in' };
      });
  },

  check: (req, permissions, districtId) => {
    return module.exports.getUserCtx(req)
      .then(userCtx => {
        if (isDbAdmin(userCtx)) {
          return { user: userCtx.name };
        }
        if (!module.exports.hasAllPermissions(userCtx, permissions)) {
          throw { code: 403, message: 'Insufficient privileges' };
        }
        return getFacilityId(req, userCtx)
          .catch(err => {
            throw { code: 500, message: err };
          })
          .then(facilityId => checkDistrict(districtId, facilityId))
          .then(district => ({ user: userCtx.name, district: district }));
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

    let username, password;
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
        _.extend(medicUser, _.pick(user, 'name', 'roles', 'facility_id'));
        return medicUser;
      });
  }
};
