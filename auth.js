var http = require('http'),
    _ = require('underscore'),
    db = require('./db');

var permissionsMap = {
  can_export_messages: ['national_admin', 'district_admin', 'analytics'],
  can_export_audit: ['national_admin'],
  can_export_feedback: ['national_admin'],
  can_execute_schedules: [],
  can_export_server_logs: ['national_admin'],
  can_export_contacts: ['national_admin', 'district_admin'],
  can_view_analytics: ['national_admin', 'district_admin', 'analytics'],
  can_view_data_records: [
      'national_admin',
      'district_admin',
      'analytics',
      'gateway'
  ],
  can_view_unallocated_data_records: [
      'national_admin',
      'district_admin',
      'gateway'
  ],
  can_edit: [
      'national_admin',
      'district_admin',
      'gateway'
  ],
  can_update_messages: [
      'national_admin',
      'district_admin',
      'gateway'
  ],
  can_update_records: [
      'national_admin',
      'district_admin',
      'gateway'
  ],
  can_create_records: [
      'national_admin',
      'district_admin',
      'data_entry',
      'gateway'
  ]
};

var get = function(url, headers, callback) {
  http.get({
    host: db.settings.host,
    port: db.settings.port,
    path: url,
    headers: headers
  }, function(res) {

    var content = [];

    res.on('data', function (chunk) {
      content.push(chunk);
    });

    res.on('end', function () {
      var json;
      try {
        json = JSON.parse(content.join(''));
      } catch(e) {
        return callback('Could not parse response');
      }
      callback(null, json);
    });

    res.on('error', function(e) {
      callback(e);
    });

  }).on('error', function(e) {
    callback(e.message);
  });
};

var hasRole = function(userCtx, role) {
  return _.contains(userCtx && userCtx.roles, role);
};

var isDbAdmin = function(userCtx) {
  return hasRole(userCtx, '_admin');
};

var hasPermission = function(userCtx, permission) {
  if (!permissionsMap[permission]) {
    return false;
  }
  return _.some(permissionsMap[permission], function(role) {
    return _.contains(userCtx.roles, role);
  });
};

var hasAllPermissions = function(userCtx, permissions) {
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

var getUserCtx = function(req, callback) {
  get('/_session', req.headers, function(err, auth) {
    if (err) {
      return callback(err);
    }
    if (auth && auth.userCtx && auth.userCtx.name) {
      callback(null, auth.userCtx);
    } else {
      callback('Not logged in');
    }
  });
};

module.exports = {

  check: function(req, permissions, districtId, callback) {
    getUserCtx(req, function(err, userCtx) {
      if (err) {
        return callback({ code: 401, message: err });
      }
      if (isDbAdmin(userCtx)) {
        return callback(null, { user: userCtx.name });
      }
      if (!hasAllPermissions(userCtx, permissions)) {
        return callback({ code: 403, message: 'Insufficient privileges' });
      }
      var url = '/_users/org.couchdb.user:' + userCtx.name;
      get(url, req.headers, function(err, user) {
        if (err) {
          return callback({ code: 500, message: err });
        }
        checkDistrict(districtId, user.facility_id, function(err, district) {
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
      return callback('No path given');
    }
    http.request({
      method: 'HEAD',
      host: db.settings.host,
      port: db.settings.port,
      path: req.params.path,
      headers: req.headers
    }, function(res) {
      callback(null, { status: res.statusCode } );
    }).on('error', function(e) {
      callback(e.message);
    }).end();
  }

};
