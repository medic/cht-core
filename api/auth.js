var request = require('request'),
    url = require('url'),
    _ = require('underscore'),
    db = require('./db'),
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
    get('/_session', req.headers, function(err, auth) {
      if (err) {
        return callback({ code: 401, message: 'Not logged in', err: err });
      }
      if (auth && auth.userCtx && auth.userCtx.name) {
        return callback(null, auth.userCtx);
      }
      callback({ code: 401, message: 'Not logged in' });
    });
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
    module.exports.getUserCtx(req, function(err, userCtx) {
      if (err) {
        return callback(err);
      }
      if (isDbAdmin(userCtx)) {
        return callback(null, { user: userCtx.name });
      }
      if (!module.exports.hasAllPermissions(userCtx, permissions)) {
        return callback({ code: 403, message: 'Insufficient privileges' });
      }
      module.exports.getFacilityId(req, userCtx, function(err, facilityId) {
        if (err) {
          return callback({ code: 500, message: err });
        }
        checkDistrict(districtId, facilityId, function(err, district) {
          if (err) {
            return callback(err);
          }
          callback(null, { user: userCtx.name, district: district });
        });
      });
    });
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
  }

};
