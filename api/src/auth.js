var request = require('request'),
    url = require('url'),
    _ = require('underscore'),
    db = require('./db-pouch'),
    config = require('./config'),
    ONLINE_ROLE = 'mm-online';

var get = (path, headers) => {
  const dbUrl = url.parse(db.serverUrl);
  var fullUrl = url.format({
    protocol: dbUrl.protocol,
    host: dbUrl.host,
    pathname: path
  });
  return new Promise((resolve, reject) => {
    request.get({
      url: fullUrl,
      headers: headers,
      json: true
    }, (err, res, body) => {
      if (err) {
        return reject(err);
      }
      resolve(body);
    });
  });
};

// TODO Use a shared library for this duplicated code #4021
var hasRole = (userCtx, role) => {
  return _.contains(userCtx && userCtx.roles, role);
};

var isDbAdmin = userCtx => hasRole(userCtx, '_admin');

var hasPermission = (userCtx, permission) => {
  var perm = _.findWhere(config.get('permissions'), { name: permission });
  if (!perm) {
    return false;
  }
  return _.some(perm.roles, role => _.contains(userCtx.roles, role));
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

  checkUrl: (req, callback) => {
    if (!req.params || !req.params.path) {
      return callback(new Error('No path given'));
    }
    const dbUrl = url.parse(db.serverUrl);
    var fullUrl = url.format({
      protocol: dbUrl.protocol,
      host: dbUrl.host,
      pathname: req.params.path
    });
    request.head({
      url: fullUrl,
      headers: req.headers,
      json: true
    }, (err, res) => {
      if (err) {
        return callback(err);
      }
      callback(null, res && { status: res.statusCode } );
    });
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
      [username, password] = new Buffer(authHeader.split(' ')[1], 'base64').toString().split(':');
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
   * @param      {Function}  callback    returns the validated username or an
   *                                     error if there was a problem
   */
  validateBasicAuth: ({username, password}, callback) => {
    const authUrl = url.parse(process.env.COUCH_URL);
    delete authUrl.pathname;
    authUrl.auth = `${username}:${password}`;

    request({ uri: url.format(authUrl), method: 'HEAD'}, (err, res) => {
      if (err) {
        return callback(err);
      }

      if (res.statusCode !== 200) {
        return callback(Error(`Expected 200 got ${res.statusCode}`));
      }

      callback(null, username);
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
