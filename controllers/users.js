var async = require('async'),
    _ = require('underscore'),
    db = require('../db');

var USER_EDITABLE_FIELDS  = [
  'password',
  'known',
  'place',
  'type'
];

var SETTINGS_EDITABLE_FIELDS  = [
  'fullname',
  'email',
  'phone',
  'language',
  'known',
  'place',
  'contact',
  'type'
];

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
 * non-critical errors. If messages object is passed in and status codes match
 * we use the provided message.
 */
var handleBadRequest = function(error, messages, callback) {
  if (_.isUndefined(callback)) {
    callback = messages;
    messages = void 0;
  }
  if (_.isString(error)) {
    return callback({
      code: 400,
      message: error
    });
  } else if (_.isObject(error) && _.isObject(messages)) {
    // try custom messages
    if (messages && messages[error.statusCode]) {
      return callback({
        code: error.statusCode,
        message: messages[error.statusCode]
      });
    }
  }
  return callback(error);
};

var validateContact = function(id, placeID, callback) {
  var errors = {
    404: 'Failed to find contact.'
  };
  db.medic.get(id, function(err, doc) {
    if (err) {
      return handleBadRequest(err, errors, callback);
    }
    if (doc.type !== 'person') {
      return handleBadRequest('Wrong type, this is not a contact.', callback);
    }
    if (!module.exports._hasParent(doc, placeID)) {
      return handleBadRequest('Contact is not within place.', callback);
    }
    callback(null, doc);
  });
};

var validatePlace = function(id, callback) {
  var errors = {
    404: 'Failed to find place.'
  };
  db.medic.get(id, function(err, doc) {
    if (err) {
      return handleBadRequest(err, errors, callback);
    }
    if (!isAPlace(doc)) {
      return handleBadRequest('Wrong type, this is not a place.', callback);
    }
    callback(null, doc);
  });
};

var validateUser = function(id, callback) {
  var errors = {
    404: 'Failed to find place.'
  };
  db._users.get(id, function(err, doc) {
    if (err) {
      return handleBadRequest(err, errors, callback);
    }
    callback(null, doc);
  });
};

var validateUserSettings = function(id, callback) {
  var errors = {
    404: 'Failed to find user settings.'
  };
  db.medic.get(id, function(err, doc) {
    if (err) {
      return handleBadRequest(err, errors, callback);
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
      user = getUserUpdates(data.username, data);
  if (!user.roles) {
    user.roles = getRoles('district-manager');
  }
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
  var settings = getSettingsUpdates(data.username, data);
  if (!settings.roles) {
    settings.roles = getRoles('district-manager');
  }
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

/*
 * Update admin password if user is an admin.
 */
var updateAdminPassword = function(username, password, callback) {
  if (_.isUndefined(username) || _.isUndefined(password)) {
    return callback();
  }
  module.exports._getAdmins(function(err, admins) {
    if (err) {
      return callback(err);
    }
    if (!admins[username]) {
      // not an admin
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

var getSettingsUpdates = function(username, data) {
  var settings = {};
  _.forEach(SETTINGS_EDITABLE_FIELDS , function(key) {
    if (!_.isUndefined(data[key])) {
      settings[key] = data[key];
    }
  });
  if (data.type) {
    settings.roles = getRoles(data.type);
  }
  if (data.place) {
    settings.facility_id = getDocID(data.place);
  }
  if (data.contact) {
    settings.contact_id = getDocID(data.contact);
  }
  if (data.language && data.language.code) {
    settings.language = data.language.code;
  }
  settings.name = username;
  settings.type = 'user-settings';
  return settings;
};

var getUserUpdates = function(username, data) {
  var user = {};
  _.forEach(USER_EDITABLE_FIELDS , function(key) {
    if (!_.isUndefined(data[key])) {
      user[key] = data[key];
    }
  });
  if (data.type) {
    user.roles = getRoles(data.type);
  }
  if (data.place) {
    user.facility_id = getDocID(data.place);
  }
  user.name = username;
  user.type = 'user';
  return user;
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
  _validateContact: validateContact,
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
          return handleBadRequest('Failed to find contact parent.', callback);
        }
        if (!self._hasParent(facility, data.place)) {
          return handleBadRequest('Contact is not within place.', callback);
        }
        // save result to contact object
        data.contact.parent = facility;
        // set contact type
        data.contact.type = 'person';
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
        series = [],
        response = {},
        settings,
        user;
    var props = _.uniq(USER_EDITABLE_FIELDS .concat(SETTINGS_EDITABLE_FIELDS));
    if (!_.some(props, function(k) { return !_.isUndefined(data[k]); })) {
      return handleBadRequest(
        'One of the following fields are required: ' + props.join(', '),
        callback
      );
    }
    self._validateUser(userID, function(err, doc) {
      if (err) {
        return callback(err);
      }
      user = _.extend(doc, self._getUserUpdates(username, data));
      self._validateUserSettings(userID, function(err, doc) {
        if (err) {
          return callback(err);
        }
        settings = _.extend(doc, self._getSettingsUpdates(username, data));
        if (data.place) {
          settings.facility_id = user.facility_id;
          series.push(function(cb) {
            self._validatePlace(user.facility_id, cb);
          });
        }
        if (data.contact) {
          series.push(function(cb) {
            self._validateContact(settings.contact_id, user.facility_id, cb);
          });
        }
        if (data.password) {
          series.push(function(cb) {
            self._updateAdminPassword(username, data.password, cb);
          });
        }
        series.push(function(cb) {
          self._updateUser(userID, user, function(err, resp) {
            if (err) {
              return cb(err);
            }
            if (resp) {
              response.user = {
                id: resp.id,
                rev: resp.rev
              };
            }
            cb();
          });
        });
        series.push(function(cb) {
          self._updateUserSettings(userID, settings, function(err, resp) {
            if (err) {
              return cb(err);
            }
            if (resp) {
              response['user-settings'] = {
                id: resp.id,
                rev: resp.rev
              };
            }
            cb();
          });
        });
        async.series(series, function(err) {
          if (err) {
            return handleBadRequest(err, callback);
          }
          callback(null, response);
        });
      });
    });
  }
};
