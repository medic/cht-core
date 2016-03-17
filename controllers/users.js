var async = require('async'),
    _ = require('underscore'),
    db = require('../db');

var getType = function(user, admins) {
  if (user.roles && user.roles.length) {
    return user.roles[0];
  }
  return admins[user.name] ? 'admin' : 'unknown';
};

var getDoc = function(id, docs) {
  return _.findWhere(docs, { _id: id });
};

var getDocID = function(doc) {
  if (_.isString(doc)) {
    return doc;
  }
  if (_.isObject(doc)) {
    return doc._id;
  }
};

var getAllUserSettings = function(callback) {
  var opts = {
    include_docs: true,
    key: ['user-settings']
  };
  db.medic.view('medic', 'doc_by_type', opts, function(err, results) {
    if (err) {
      return callback(err);
    }
    callback(null, _.map(results.rows, function(row) {
      return row.doc;
    }));
  });
};

var getAllUsers = function(callback) {
  db._users.list({include_docs: true}, function(err, results) {
    callback(err, results.rows);
  });
};

var getFacilities = function(callback) {
  db.medic.view('medic', 'facilities', {include_docs: true}, function(err, results) {
    if (err) {
      return callback(err);
    }
    callback(null, _.map(results.rows, function(row) {
      return row.doc;
    }));
  });
};

var isAPlace = function(place) {
  return [
    'district_hospital',
    'health_center',
    'clinic'
  ].indexOf(place.type) !== -1;
};

/*
 * Make string errors 400 responses to minimize stacktraces in the logs for
 * non-critical errors.
 */
var handleBadRequest = function(err, callback) {
  if (_.isString(err)) {
    return callback({code: 400, message: err});
  }
  return callback(err);
};

var validatePlace = function(id, callback) {
  db.medic.get(id, function(err, place) {
    if (err) {
      if (err.error === 'not_found') {
        return handleBadRequest('Failed to find place.', callback);
      }
      return callback(err);
    }
    if (!isAPlace(place)) {
      return handleBadRequest('Wrong type, this is not a place.', callback);
    }
    callback(null, place);
  });
};


var validateUser = function(id, callback) {
  db._users.get(id, function(err, doc) {
    if (err) {
      if (err.error === 'not_found') {
        return handleBadRequest('Failed to find user.', callback);
      }
      return callback(err);
    }
    callback(null, doc);
  });
};

var validateUserSettings = function(id, callback) {
  db.medic.get(id, function(err, doc) {
    if (err) {
      if (err.error === 'not_found') {
        return handleBadRequest('Failed to find user settings.', callback);
      }
      return callback(err);
    }
    callback(null, doc);
  });
};

var updateUser = function(id, user, callback) {
  db._users.insert(user, id, callback);
};

var updateUserSettings = function(id, settings, callback) {
  db.medic.insert(settings, id, callback);
};

var createUser = function(data, response, callback) {
  response = response || {};
  var id = createID(data.username),
      user = getUserUpdates(id, data);
  db._users.insert(user, id, function(err, body) {
    if (err) {
      return callback(err);
    }
    response.user = {
      id: body.id,
      rev: body.rev
    };
    callback(null, data, response);
  });
};

/*
 * Warning: not doing validation of the contact data against a form yet.  The
 * form is user defined in settings so being liberal with what gets saved to
 * the database. Ideally CouchDB could validate a given object against a form
 * in validate_doc_update.
 */
var createContact = function(data, response, callback) {
  response = response || {};
  db.medic.insert(data.contact, function(err, body) {
    if (err) {
      return callback(err);
    }
    // save contact id for user settings
    data.contact = body.id;
    response.contact = {
      id: body.id,
      rev: body.rev
    };
    callback(null, data, response);
  });
};

var createUserSettings = function(data, response, callback) {
  response = response || {};
  var settings = getSettingsUpdates(data);
  db.medic.insert(settings, createID(data.username), function(err, body) {
    if (err) {
      console.error('Failed to create user settings.');
      return callback(err);
    }
    response['user-settings'] = {
      id: body.id,
      rev: body.rev
    };
    callback(null, data, response);
  });
};

var updateAdminPassword = function(username, password, callback) {
  if (_.isUndefined(username) || _.isUndefined(password)) {
    // do nothing
    return callback();
  }
  module.exports._getAdmins(function(err, admins) {
    if (err) {
      return callback(err);
    }
    if (!admins[username]) {
      // not an admin so admin password change not required
      return callback();
    }
    db.request({
      path: '_config/admins/' + username,
      method: 'PUT',
      body: JSON.stringify(password)
    }, callback);
  });
};

var hasParent = function(facility, id) {
  // do not modify facility
  var p = facility;
  while (p) {
    if (p._id === id) {
      return true;
    }
    p = p.parent;
  }
  return false;
};

var getAdmins = function(callback) {
  var opts = {
    path: '_config/admins'
  };
  db.request(opts, callback);
};

/*
 * Warning: the following properties are redundant in the user and
 * user-settings docs:
 *
 *   `name`
 *   `known`
 *   `facility_id`
 *
 * This is because when using the mobile app only the user-settings doc is
 * available, but in this function the user doc takes precedence.  If the two
 * docs somehow get out of sync this might cause confusion.
 */
var mapUsers = function(users, settings, facilities, admins) {
  var filtered = _.filter(users, function(user) {
    return user.id.indexOf(getPrefix() + ':') === 0;
  });
  return _.map(filtered, function(user) {
    var setting = getDoc(user.id, settings) || {};
    return {
      id: user.id,
      rev: user.doc._rev,
      username: user.doc.name,
      fullname: setting.fullname,
      email: setting.email,
      phone: setting.phone,
      place: getDoc(user.doc.facility_id, facilities),
      type: getType(user.doc, admins),
      language: { code: setting.language },
      contact: getDoc(setting.contact_id, facilities),
      known: user.doc.known
    };
  });
};

var rolesMap = {
  'national-manager': ['kujua_user', 'data_entry', 'national_admin'],
  'district-manager': ['kujua_user', 'data_entry', 'district_admin'],
  'facility-manager': ['kujua_user', 'data_entry'],
  'data-entry': ['data_entry'],
  'analytics': ['kujua_analytics'],
  'gateway': ['kujua_gateway']
};

var getRoles = function(type) {
  // create a new array with the type first, by convention
  return type ? [type].concat(rolesMap[type]) : [];
};

var getSettingsUpdates = function(data) {
  return {
  // Redundant, already saved in users db.
  // name: data.name,
    fullname: data.fullname,
    email: data.email,
    phone: data.phone,
    language: data.language && data.language.code,
    known: data.known,
    facility_id: getDocID(data.place),
    contact_id: getDocID(data.contact),
    type: 'user-settings',
  };
};

var getUserUpdates = function(id, data) {
  return {
    // CouchDB uses name field for authentication, it should be based on the id.
    name: id.split(':')[1],
    password: data.password,
    // defaults role to district-manager
    roles: data.type ? getRoles(data.type) : getRoles('district-manager'),
    facility_id: getDocID(data.place),
    known: data.known,
    type: 'user'
  };
};

var getPrefix = function() {
  return 'org.couchdb.user';
};

var createID = function(name) {
  return [getPrefix(), name].join(':');
};

var deleteUser = function(id, callback) {
  // Potential problem here where _users database update happens but medic
  // update fails and user is in inconsistent state. There is no way to do
  // atomic update on more than one database with CouchDB API.
  async.parallel([
    function(cb){
      db._users.get(id, function(err, user) {
        if (err) {
          return cb(err);
        }
        user._deleted = true;
        db._users.insert(user, cb);
      });
    },
    function(cb){
      db.medic.get(id, function(err, user) {
        if (err) {
          return cb(err);
        }
        user._deleted = true;
        db.medic.insert(user, cb);
      });
    }
  ], function(err) {
    callback(err);
  });
};

/*
 * Everything not exported directly is private.  Underscore prefix is only used
 * to export functions needed for testing.
 */
module.exports = {
  _mapUsers: mapUsers,
  _createUser: createUser,
  _createContact: createContact,
  _createUserSettings: createUserSettings,
  _getType : getType,
  _getAdmins: getAdmins,
  _getAllUsers: getAllUsers,
  _getAllUserSettings: getAllUserSettings,
  _getContactParent: db.medic.get,
  _getFacilities: getFacilities,
  _getSettingsUpdates: getSettingsUpdates,
  _getUserUpdates: getUserUpdates,
  _hasParent: hasParent,
  _updateAdminPassword: updateAdminPassword,
  _updateUser: updateUser,
  _updateUserSettings: updateUserSettings,
  _validatePlace: validatePlace,
  _validateUser: validateUser,
  _validateUserSettings: validateUserSettings,
  deleteUser: function(username, callback) {
    deleteUser(createID(username), callback);
  },
  getList: function(callback) {
    var self = this;
    async.parallel([
      self._getAllUsers,
      self._getAllUserSettings,
      self._getFacilities,
      self._getAdmins
    ], function(err, results) {
      if (err) {
        return callback(err);
      }
      callback(null, self._mapUsers(results[0], results[1], results[2], results[3]));
    });
  },
  /*
   * Take the request data and create valid user, user-settings and contact
   * objects. Returns the response body in the callback.
   *
   * @param {Object} data - request body
   * @param {Function} callback
   * @api public
   */
  createUser: function(data, callback) {
    var self = this,
        required = ['username', 'password', 'place', 'contact'],
        missing = [],
        response = {};
    required.forEach(function(prop) {
      if (_.isUndefined(data[prop])) {
        missing.push(prop);
      }
    });
    if (missing.length > 0) {
      return handleBadRequest('Missing required fields: ' + missing.join(', '), callback);
    }
    if (_.isUndefined(data.contact.parent)) {
      return handleBadRequest('Contact parent is required.', callback);
    }
    // validate place exists
    self._validatePlace(getDocID(data.place), function(err) {
      if (err) {
        return callback(err);
      }
      // validate contact parent exists
      self._getContactParent(data.contact.parent, function(err, facility) {
        if (err) {
          if (err.error === 'not_found') {
            return handleBadRequest('Failed to find contact parent.', callback);
          }
          return callback(err);
        }
        if (!self._hasParent(facility, data.place)) {
          return handleBadRequest('Contact is not within place.', callback);
        }
        // save result to contact object
        data.contact.parent = facility;
        async.waterfall([
          function(cb) {
            // start the waterfall
            cb(null, data, response);
          },
          self._createUser,
          self._createContact,
          self._createUserSettings,
        ], function(err, result, responseBody) {
          callback(err, responseBody);
        });
      });
    });
  },
  updateUser: function(username, data, callback) {
    var self = this,
        userID = createID(username),
        placeID = getDocID(data.place),
        series = [];
    if (_.isUndefined(placeID) && _.isUndefined(data.type) && _.isUndefined(data.password)) {
      return handleBadRequest(
        'One of the following fields are required: type, password or place.', callback
      );
    }
    // validate user exists
    self._validateUser(userID, function(err, user) {
      if (err) {
        return callback(err);
      }
      // validate user settings exist
      self._validateUserSettings(userID, function(err, settings) {
        if (err) {
          return callback(err);
        }
        // update roles
        if (data.type) {
          user.roles = data.type ? getRoles(data.type) : user.roles;
        }
        // update password
        if (data.password) {
          user.password = data.password;
          series.push(function(cb) {
            self._updateAdminPassword(username, data.password, cb);
          });
        }
        // validate place if change requested
        if (placeID) {
          series.push(function(cb) {
            self._validatePlace(placeID, function(err) {
              if (err) {
                return cb(err);
              }
              user.facility_id = placeID;
              settings.facility_id = placeID;
              // update settings
              self._updateUserSettings(userID, settings, cb);
            });
          });
        }
        // update user
        series.push(function(cb) {
          self._updateUser(userID, user, cb);
        });
        async.series(series, callback);
      });
    });
  }
};
