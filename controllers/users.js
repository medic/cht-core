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
    if (err) {
      return callback(err);
    }
    callback(null, results.rows);
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

var getPlace = function(id, callback) {
  db.medic.get(id, function(err, place) {
    if (err) {
      return callback(err);
    }
    if (!isAPlace(place)) {
      return callback('Wrong type, this is not a place.');
    }
    callback(null, place);
  });
};

var createUser = function(data, response, callback) {
  response = response || {};
  var id = createID(data.username),
      user = getUserUpdates(id, data);
  db._users.insert(user, id, function(err, body) {
    if (err) {
      return callback('Failed to create user. ' + err);
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
      return callback('Failed to create contact. ' + err);
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
      return callback('Failed to create user settings. ' + err);
    }
    response['user-settings'] = {
      id: body.id,
      rev: body.rev
    };
    callback(null, data, response);
  });
};

var hasParent = function(facility, id) {
  if (facility._id === id) {
    return true;
  }
  // clone facility before modifying it
  var f = JSON.parse(JSON.stringify(facility));
  while (f.parent) {
    if (f.parent._id === id) {
      return true;
    }
    f.parent = f.parent.parent;
  }
  return false;
};

var getAdmins = function(callback) {
  var opts = {
    path: '_config/admins'
  };
  db.request(opts, function(err, body) {
    if (err) {
      return callback(err);
    }
    callback(null, body);
  });
};

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
      contact: getDoc(setting.contact_id, facilities)
    };
  });
};

var updatePassword = function(updated, callback) {
  if (!updated.password) {
    // password not changed, do nothing
    return callback();
  }
  module.exports._getAdmins(function(err, admins) {
    if (err) {
      if (err.error === 'unauthorized') {
        // not an admin
        return callback();
      }
      return callback(err);
    }
    if (!admins[updated.name]) {
      // not an admin so admin password change not required
      return callback();
    }
    db.request({
      path: '_config/admins/' + updated.name,
      method: 'PUT',
      body: JSON.stringify(updated.password)
    }, callback);
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
  _getPlace: getPlace,
  _getUserUpdates: getUserUpdates,
  _hasParent: hasParent,
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
    for (var i in required) {
      if (_.isUndefined(data[required[i]])) {
        missing.push(required[i]);
      }
    }
    if (missing.length > 0) {
      return callback(
        new Error('Missing required fields: ' + missing.join(', '))
      );
    }
    if (_.isUndefined(data.contact.parent)) {
      return callback(new Error('Contact parent is required.'));
    }
    // validate place exists
    self._getPlace(getDocID(data.place), function(err) {
      if (err) {
        return callback(new Error('Failed to find place. ' + err));
      }
      // validate contact parent exists
      self._getContactParent(data.contact.parent, function(err, facility) {
        if (err) {
          return callback(new Error('Failed to find contact parent. ' + err));
        }
        if (!self._hasParent(facility, data.place)) {
          return callback(new Error('Contact is not within place.'));
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
          if (err) {
            return callback(err);
          }
          callback(null, responseBody);
        });
      });
    });
  },
  updateUser: function(username, data, callback) {
    var self = this,
        userID = createID(username),
        placeID = getDocID(data.place);
    if (_.isUndefined(placeID) && _.isUndefined(data.type) && _.isUndefined(data.password)) {
      return callback(new Error(
        'One of the following fields are required: type, password or place.'
      ));
    }
    // validate user exists
    db._users.get(userID, function(err, user) {
      if (err) {
        return callback(new Error('Failed to find user. ' + err));
      }
      var updated = _.extend(self._getUserUpdates(userID, data), user);
      // validate place exists if it changed
      if (!_.isUndefined(placeID) && (placeID !== user.facility_id)) {
        self._getPlace(placeID, function(err) {
          if (err) {
            return callback(new Error('Failed to find place. ' + err));
          }
          // fix
          updatePassword({}, function(){});
          db._users.insert(updated, callback);
        });
      } else {
          // fix
          updatePassword({}, function(){});
          db._users.insert(updated, callback);
      }
    });
  }
};
