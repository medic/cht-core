var request = require('request'),
    url = require('url'),
    _ = require('underscore'),
    db = require('./db-nano'),
    config = require('./config');

var get = function(path, headers, callback) {
  var fullUrl = url.format({
    protocol: db.settings.protocol,
    hostname: db.settings.host,
    port: db.settings.port,
    pathname: path
  });
  request.get({
    url: fullUrl,
    headers: headers,
    json: true
  }, function(err, res, body) {
    callback(err, body);
  });
};

// TODO Use a shared library for this duplicated code #4021
var hasRole = function(userCtx, role) {
  return _.contains(userCtx && userCtx.roles, role);
};

var isDbAdmin = function(userCtx) {
  return hasRole(userCtx, '_admin');
};

var hasPermission = function(userCtx, permission) {
  var perm = _.findWhere(config.get('permissions'), { name: permission });
  if (!perm) {
    return false;
  }
  return _.some(perm.roles, function(role) {
    return _.contains(userCtx.roles, role);
  });
};

var checkDistrict = function(requested, permitted, callback) {
  if (!requested) {
    // limit to configured facility
    return callback(null, permitted);
  }
  if (!permitted) {
    // national admin - give them what they want
    return callback(null, requested);
  }
  if (requested === permitted) {
    // asking for the allowed facility
    return callback(null, requested);
  }
  return callback({ code: 403, message: 'Insufficient privileges' });
};


module.exports = {
  isDbAdmin: (req, callback) => {
    module.exports.getUserCtx(req, (err, userCtx) => {
      if (err) {
        return callback(err);
      }

      callback(null, isDbAdmin(userCtx));
    });
  },

  isAdmin: function(userCtx) {
    return hasRole(userCtx, '_admin') ||
           hasRole(userCtx, 'national_admin');
  },

  hasAllPermissions: function(userCtx, permissions) {
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

  getUserCtx: function(req, callback) {
    const _getUserCtx = (resolve, reject) => {
      get('/_session', req.headers, function(err, auth) {
        if (err) {
          return reject({ code: 401, message: 'Not logged in', err: err });
        }
        if (auth && auth.userCtx && auth.userCtx.name) {
          return resolve(auth.userCtx);
        }
        reject({ code: 401, message: 'Not logged in' });
      });
    };

    if (!callback) {
      return new Promise(_getUserCtx);
    } else {
      _getUserCtx(_.partial(callback, null), callback);
    }
  },

  getFacilityId: function(req, userCtx, callback) {
    var url = '/_users/org.couchdb.user:' + userCtx.name;
    get(url, req.headers, function(err, user) {
      if (err) {
        return callback({ code: 500, message: err });
      }
      callback(null, user.facility_id);
    });
  },

  getContactId: function(userCtx, callback) {
    db.medic.get('org.couchdb.user:' + userCtx.name, function(err, user) {
      callback(err, user && user.contact_id);
    });
  },

  check: function(req, permissions, districtId, callback) {
    const _check = (resolve, reject) => {
      module.exports.getUserCtx(req, function(err, userCtx) {
        if (err) {
          return reject(err);
        }
        if (isDbAdmin(userCtx)) {
          return resolve({ user: userCtx.name });
        }
        if (!module.exports.hasAllPermissions(userCtx, permissions)) {
          return reject({ code: 403, message: 'Insufficient privileges' });
        }
        module.exports.getFacilityId(req, userCtx, function(err, facilityId) {
          if (err) {
            return reject({ code: 500, message: err });
          }
          checkDistrict(districtId, facilityId, function(err, district) {
            if (err) {
              return reject(err);
            }
            resolve({ user: userCtx.name, district: district });
          });
        });
      });
    };

    if (!callback) {
      return new Promise(_check);
    } else {
      _check(_.partial(callback, null), callback);
    }
  },

  checkUrl: function(req, callback) {
    if (!req.params || !req.params.path) {
      return callback(new Error('No path given'));
    }
    var fullUrl = url.format({
      protocol: db.settings.protocol,
      hostname: db.settings.host,
      port: db.settings.port,
      pathname: req.params.path
    });
    request.head({
      url: fullUrl,
      headers: req.headers,
      json: true
    }, function(err, res) {
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

  getUserSettings: function(userCtx, callback) {
    const _getUserSettings = (resolve, reject) => {
      db.medic.get('org.couchdb.user:' + userCtx.name, function(err, user) {
        if (err) {
          return reject(err);
        }

        return resolve(user);
      });
    };

    if (!callback) {
      return new Promise(_getUserSettings);
    }

    _getUserSettings(_.partial(callback, null), callback);
  }
};
