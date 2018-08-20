const async = require('async'),
      _ = require('underscore'),
      passwordTester = require('simple-password-tester'),
      people  = require('./people'),
      places = require('./places'),
      db = require('../db-nano'),
      config = require('../config'),
      dbPouch = require('../db-pouch'),
      lineage = require('lineage')(Promise, dbPouch.medic);
const getRoles = require('../services/types-and-roles');

const USER_PREFIX = 'org.couchdb.user:';
const ONLINE_ROLE = 'mm-online';

const PASSWORD_MINIMUM_LENGTH = 8,
      PASSWORD_MINIMUM_SCORE = 50,
      USERNAME_WHITELIST = /^[a-z0-9_-]+$/;

const RESTRICTED_USER_EDITABLE_FIELDS = [
  'password',
  'known'
];

const USER_EDITABLE_FIELDS = RESTRICTED_USER_EDITABLE_FIELDS.concat([
  'place',
  'type',
  'roles',
]);

const RESTRICTED_SETTINGS_EDITABLE_FIELDS = [
  'fullname',
  'email',
  'phone',
  'language',
  'known',
];

const SETTINGS_EDITABLE_FIELDS = RESTRICTED_SETTINGS_EDITABLE_FIELDS.concat([
  'place',
  'contact',
  'external_id',
  'type',
  'roles',
]);

const ALLOWED_RESTRICTED_EDITABLE_FIELDS =
  RESTRICTED_SETTINGS_EDITABLE_FIELDS.concat(RESTRICTED_USER_EDITABLE_FIELDS);

const illegalDataModificationAttempts = data =>
  Object.keys(data).filter(k => !ALLOWED_RESTRICTED_EDITABLE_FIELDS.includes(k));

/*
 * Set error codes to 400 to minimize 500 errors and stacktraces in the logs.
 */
var error400 = msg => {
  return { code: 400, message: msg };
};

var getType = function(user) {
  if (user.roles && user.roles.length) {
    return user.roles[0];
  }
  return 'unknown';
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
  db.medic.view('medic-client', 'doc_by_type', opts, function(err, results) {
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
  db.medic.view('medic-client', 'contacts_by_type', {include_docs: true}, function(err, results) {
    if (err) {
      return callback(err);
    }
    callback(null, _.map(results.rows, function(row) {
      return row.doc;
    }));
  });
};

var validateContact = function(id, placeID, callback) {
  db.medic.get(id, function(err, doc) {
    if (err) {
      if (err.statusCode === 404) {
        err.message = 'Failed to find contact.';
      }
      return callback(err, callback);
    }
    if (doc.type !== 'person') {
      return callback(error400('Wrong type, contact is not a person.'));
    }
    if (!module.exports._hasParent(doc, placeID)) {
      return callback(error400('Contact is not within place.'));
    }
    callback(null, doc);
  });
};

var validateUser = function(id, callback) {
  db._users.get(id, function(err, doc) {
    if (err) {
      if (err.statusCode === 404) {
        err.message = 'Failed to find user.';
      }
      return callback(err);
    }
    callback(null, doc);
  });
};

var validateUserSettings = function(id, callback) {
  db.medic.get(id, function(err, doc) {
    if (err) {
      if (err.statusCode === 404) {
        err.message = 'Failed to find user settings.';
      }
      return callback(err);
    }
    callback(null, doc);
  });
};

var validateNewUsername = function(username, callback) {
  if (!USERNAME_WHITELIST.test(username)) {
    return callback(error400('Invalid user name. Valid characters are lower case letters, numbers, underscore (_), and hyphen (-).'));
  }
  var id = createID(username);
  var error = function() {
    return error400('Username "' + username + '" already taken.');
  };
  async.series([
    function(cb) {
      db._users.get(id, function(err) {
        if (err) {
          if (err.statusCode === 404) {
            // username not in use, it's valid.
            return cb();
          }
          err.message = 'Failed to validate new username: ' + err.message;
          return cb(err);
        }
        cb(error());
      });
    },
    function(cb) {
      db.medic.get(id, function(err) {
        if (err) {
          if (err.statusCode === 404) {
            // username not in use, it's valid.
            return cb();
          }
          err.message = 'Failed to validate new username: ' + err.message;
          return cb(err);
        }
        cb(error());
      });
    }
  ], callback);
};

var storeUpdatedUser = function(id, user, callback) {
  db._users.insert(user, id, callback);
};

var storeUpdatedUserSettings = function(id, settings, callback) {
  db.medic.insert(settings, id, callback);
};

var createUser = function(data, response, callback) {
  response = response || {};
  var id = createID(data.username),
      user = getUserUpdates(data.username, data);
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

var createContact = function(data, response, callback) {
  if (!data.contact) {
    return callback(null, data, response);
  }

  response = response || {};
  people.getOrCreatePerson(data.contact)
    .then(doc => {
      data.contact = doc;
      response.contact = {
        id: doc._id,
        rev: doc._rev
      };
      callback(null, data, response);
    })
    .catch(err => callback(err));
};

var createUserSettings = function(data, response, callback) {
  response = response || {};
  var settings = getSettingsUpdates(data.username, data);
  db.medic.insert(settings, createID(data.username), function(err, body) {
    if (err) {
      return callback(err);
    }
    response['user-settings'] = {
      id: body.id,
      rev: body.rev
    };
    callback(null, data, response);
  });
};

var createPlace = function(data, response, callback) {
  if (!data.place) {
    return callback(null, data, response);
  }

  places.getOrCreatePlace(data.place)
    .then(doc => {
      data.place = doc;
      callback(null, data, response);
    })
    .catch(callback);
};

var storeUpdatedPlace = function(data, response, callback) {
  if (!data.place) {
    return callback(null, data, response);
  }

  data.place.contact = lineage.minifyLineage(data.contact);
  data.place.parent = lineage.minifyLineage(data.place.parent);
  db.medic.insert(data.place, function(err) {
    callback(err, data, response);
  });
};

var setContactParent = function(data, response, callback) {
  if (!data.contact) {
    return callback(null, data, response);
  }

  const contactId = getDocID(data.contact);
  if (contactId) {
    // assigning to existing contact
    const placeId = getDocID(data.place);
    validateContact(contactId, placeId, (err) => {
      if (err) {
        if (err.statusCode === 404) {
          // try creating the user
          data.contact.parent = lineage.minifyLineage(data.place);
          return callback(null, data, response);
        } else {
          return callback(err);
        }
      }
      callback(null, data, response);
    });
  } else if (data.contact.parent) {
    // contact parent must exist
    places.getPlace(data.contact.parent)
      .then(place => {
        if (!module.exports._hasParent(place, data.place)) {
          return callback(error400('Contact is not within place.'));
        }
        // save result to contact object
        data.contact.parent = lineage.minifyLineage(place);
        callback(null, data, response);
      })
      .catch(callback);
  } else {
    // creating new contact
    data.contact.parent = lineage.minifyLineage(data.place);
    callback(null, data, response);
  }
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
var mapUsers = function(users, settings, facilities) {
  var filtered = _.filter(users, function(user) {
    return user.id.indexOf(USER_PREFIX) === 0;
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
      type: getType(user.doc),
      language: { code: setting.language },
      contact: getDoc(setting.contact_id, facilities),
      external_id: setting.external_id,
      known: user.doc.known
    };
  });
};

var isOffline = function(roles) {
  const configured = config.get('roles') || {};
  return roles.some(r => configured[r] && configured[r].offline);
};

var getSettingsUpdates = function(username, data) {
  const ignore = ['type', 'place', 'contact'];

  const settings = {
    name: username,
    type: 'user-settings'
  };

  _.forEach(SETTINGS_EDITABLE_FIELDS , function(key) {
    if (!_.isUndefined(data[key]) && ignore.indexOf(key) === -1) {
      settings[key] = data[key];
    }
  });

  if (data.type) {
    // deprecated: use 'roles' instead
    settings.roles = getRoles(data.type);
  }
  if (settings.roles) {
    var index = settings.roles.indexOf(ONLINE_ROLE);
    if (isOffline(settings.roles)) {
      if (index !== -1) {
        // remove the online role
        settings.roles.splice(index, 1);
      }
    } else if (index === -1) {
      // add the online role
      settings.roles.push(ONLINE_ROLE);
    }
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

  return settings;
};

var getUserUpdates = function(username, data) {
  const ignore = ['type', 'place'];

  const user = {
    name: username,
    type: 'user'
  };

  _.forEach(USER_EDITABLE_FIELDS , function(key) {
    if (!_.isUndefined(data[key]) && ignore.indexOf(key) === -1) {
      user[key] = data[key];
    }
  });

  if (data.type) {
    // deprecated: use 'roles' instead
    user.roles = getRoles(data.type);
  }
  if (user.roles && !isOffline(user.roles)) {
    user.roles.push(ONLINE_ROLE);
  }
  if (data.place) {
    user.facility_id = getDocID(data.place);
  }

  return user;
};

var createID = function(name) {
  return USER_PREFIX + name;
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

const validatePassword = password => {
  if (password.length < PASSWORD_MINIMUM_LENGTH) {
    return error400(`The password must be at least ${PASSWORD_MINIMUM_LENGTH} characters long.`);
  }
  if (passwordTester(password) < PASSWORD_MINIMUM_SCORE) {
    return error400('The password is too easy to guess. Include a range of types of characters to increase the score.');
  }
};

/*
 * Everything not exported directly is private.  Underscore prefix is only used
 * to export functions needed for testing.
 */
module.exports = {
  _mapUsers: mapUsers,
  _createUser: createUser,
  _createContact: createContact,
  _createPlace: createPlace,
  _createUserSettings: createUserSettings,
  _getType : getType,
  _getAllUsers: getAllUsers,
  _getAllUserSettings: getAllUserSettings,
  _getFacilities: getFacilities,
  _getSettingsUpdates: getSettingsUpdates,
  _getUserUpdates: getUserUpdates,
  _hasParent: hasParent,
  _lineage: lineage,
  _setContactParent: setContactParent,
  _storeUpdatedPlace: storeUpdatedPlace,
  _storeUpdatedUser: storeUpdatedUser,
  _storeUpdatedUserSettings: storeUpdatedUserSettings,
  _validateContact: validateContact,
  _validateNewUsername: validateNewUsername,
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
    ], function(err, results) {
      if (err) {
        return callback(err);
      }
      callback(null, self._mapUsers(results[0], results[1], results[2]));
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
    const missingFields = data => {
      const required = ['username', 'password'];
      if (data.roles && isOffline(data.roles)) {
        required.push('place', 'contact');
      }

      const missing = required.filter(prop => !data[prop]);

      if (!data.type && !data.roles) {
        missing.push('type or roles');
      }

      return missing;
    };

    const self = this;
    const missing = missingFields(data);
    if (missing.length > 0) {
      return callback(error400('Missing required fields: ' + missing.join(', ')));
    }
    var passwordError = validatePassword(data.password);
    if (passwordError) {
      return callback(passwordError);
    }
    self._validateNewUsername(data.username, function(err) {
      if (err) {
        return callback(err);
      }
      async.waterfall([
        function(cb) {
          // start the waterfall
          cb(null, data, {});
        },
        self._createPlace,
        self._setContactParent,
        self._createContact,
        self._storeUpdatedPlace,
        self._createUser,
        self._createUserSettings,
      ], function(err, result, responseBody) {
        callback(err, responseBody);
      });
    });
  },

  /**
   * Updates the given user.
   *
   * If fullAccess is passed as false we should restrict them from updating
   * anything that elevates or changes their priviledge (such as roles or
   * permissions.)
   *
   * NB: once we have gotten to this point it is presumed that the user has
   * already been authenticated. For restricted users updating themselves
   * (!fullAccess) this is especially important.
   *
   * @param      {String}    username    raw username (without org.couch)
   * @param      {Object}    data        Changes to make
   * @param      {Boolean}   fullAccess  Are we allowed to update
   *                                     security-related things?
   * @param      {Function}  callback    callback
   */
  updateUser: function(username, data, fullAccess, callback) {
    // Reject update attempts that try to modify data they're not allowed to
    if (!fullAccess) {
      const illegalAttempts = illegalDataModificationAttempts(data);
      if (illegalAttempts.length) {
        const err = Error('You do not have permission to modify: ' + illegalAttempts.join(','));
        err.statusCode = 401;
        return callback(err);
      }
    }

    const self = this,
          userID = createID(username);
    const props = _.uniq(USER_EDITABLE_FIELDS.concat(SETTINGS_EDITABLE_FIELDS));
    const hasFields = _.some(props, function(k) {
      return (!_.isNull(data[k]) && !_.isUndefined(data[k]));
    });
    //Online users can remove place or contact
    if (!hasFields && !_.isNull(data.place) && !_.isNull(data.contact)) {
      return callback(error400('One of the following fields are required: ' + props.join(', ')));
    }
    if (data.password) {
      var passwordError = validatePassword(data.password);
      if (passwordError) {
        return callback(passwordError);
      }
    }
    self._validateUser(userID, function(err, doc) {
      if (err) {
        return callback(err);
      }

      // TODO log out what is going to happen
      //      we need the authenticated username as well
      //      as the given username and data we already have
      // https://github.com/medic/medic-webapp/issues/4097

      const user = _.extend(doc, self._getUserUpdates(username, data));
      self._validateUserSettings(userID, function(err, doc) {
        if (err) {
          return callback(err);
        }
        const series = [];
        const response = {};
        const settings = _.extend(doc, self._getSettingsUpdates(username, data));
        if (data.place) {
          settings.facility_id = user.facility_id;
          series.push(function(cb) {
            places.getPlace(user.facility_id)
              .then(place => cb(null, place))
              .catch(cb);
          });
        } else if(_.isNull(data.place)) {
          if(settings.roles && isOffline(settings.roles)) {
            return callback(error400('Place field is required for offline users'));
          }
          user.facility_id = null;
          settings.facility_id = null;
        }
        if (data.contact) {
          series.push(function(cb) {
            self._validateContact(settings.contact_id, user.facility_id, cb);
          });
        } else if (_.isNull(data.contact)) {
          if(settings.roles && isOffline(settings.roles)) {
            return callback(error400('Contact field is required for offline users'));
          }
          settings.contact_id = null;
        }
        series.push(function(cb) {
          self._storeUpdatedUser(userID, user, function(err, resp) {
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
          self._storeUpdatedUserSettings(userID, settings, function(err, resp) {
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
            return callback(err);
          }
          callback(null, response);
        });
      });
    });
  }
};
