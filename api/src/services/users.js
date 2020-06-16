const _ = require('lodash');
const passwordTester = require('simple-password-tester');
const people  = require('../controllers/people');
const places = require('../controllers/places');
const db = require('../db');
const lineage = require('@medic/lineage')(Promise, db.medic);
const getRoles = require('./types-and-roles');
const auth = require('../auth');
const moment = require('moment');

const USER_PREFIX = 'org.couchdb.user:';
const ONLINE_ROLE = 'mm-online';
const DOC_IDS_WARN_LIMIT = 10000;

const PASSWORD_MINIMUM_LENGTH = 8;
const PASSWORD_MINIMUM_SCORE = 50;
const USERNAME_WHITELIST = /^[a-z0-9_-]+$/;

const MAX_CONFLICT_RETRY = 3;

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
const error400 = (msg, key, params) => ({
  code: 400, message: { message: msg, translationKey: key, translationParams: params }
});

const getType = user => {
  if (user.roles && user.roles.length) {
    return user.roles[0];
  }
  return 'unknown';
};

const getDoc = (id, docs) =>  _.find(docs, { _id: id });

const getDocID = doc => {
  if (_.isString(doc)) {
    return doc;
  }
  if (_.isObject(doc)) {
    return doc._id;
  }
};

const getAllUserSettings = () => {
  const opts = {
    include_docs: true,
    key: ['user-settings']
  };
  return db.medic.query('medic-client/doc_by_type', opts)
    .then(result => result.rows.map(row => row.doc));
};

const getAllUsers = () => {
  return db.users.allDocs({ include_docs: true })
    .then(result => result.rows);
};

const getFacilities = () => {
  return db.medic.query('medic-client/contacts_by_type', { include_docs: true })
    .then(result => result.rows.map(row => row.doc));
};

const validateContact = (id, placeID) => {
  return db.medic.get(id)
    .then(doc => {
      if (!people.isAPerson(doc)) {
        return Promise.reject(error400('Wrong type, contact is not a person.','contact.type.wrong'));
      }
      if (!module.exports._hasParent(doc, placeID)) {
        return Promise.reject(error400('Contact is not within place.','configuration.user.place.contact'));
      }
      return doc;
    });
};

const validateUser = id => {
  return db.users.get(id)
    .catch(err => {
      if (err.status === 404) {
        err.message = 'Failed to find user.';
      }
      return Promise.reject(err);
    });
};

const validateUserSettings = id => {
  return db.medic.get(id)
    .catch(err => {
      if (err.status === 404) {
        err.message = 'Failed to find user settings.';
      }
      return Promise.reject(err);
    });
};

const validateNewUsernameForDb = (username, database) => {
  return database.get(createID(username))
    .catch(err => {
      if (err.status === 404) {
        // username not found - it's valid.
        return;
      }
      // unexpected error
      err.message = 'Failed to validate new username: ' + err.message;
      return Promise.reject(err);
    })
    .then(user => {
      if (user) {
        return Promise.reject(error400(
          'Username "'+ username +'" already taken.',
          'username.taken',
          { 'username': username }
        ));
      }
    });
};

const validateNewUsername = username => {
  if (!USERNAME_WHITELIST.test(username)) {
    return Promise.reject(error400(
      'Invalid user name. Valid characters are lower case letters, numbers, underscore (_), and hyphen (-).',
      'username.invalid'
    ));
  }
  return Promise.all([
    validateNewUsernameForDb(username, db.users),
    validateNewUsernameForDb(username, db.medic)
  ]);
};

const createUser = (data, response) => {
  const user = getUserUpdates(data.username, data);
  user._id = createID(data.username);
  return db.users.put(user).then(body => {
    response.user = {
      id: body.id,
      rev: body.rev
    };
  });
};

const createContact = (data, response) => {
  if (!data.contact) {
    return;
  }
  return people.getOrCreatePerson(data.contact).then(doc => {
    data.contact = doc;
    response.contact = {
      id: doc._id,
      rev: doc._rev
    };
  });
};

const createUserSettings = (data, response) => {
  const settings = getSettingsUpdates(data.username, data);
  settings._id = createID(data.username);
  return db.medic.put(settings).then(body => {
    response['user-settings'] = {
      id: body.id,
      rev: body.rev
    };
  });
};

const createPlace = data => {
  if (!data.place) {
    return;
  }
  return places.getOrCreatePlace(data.place).then(doc => {
    data.place = doc;
  });
};

const storeUpdatedPlace = (data, retry = 0) => {
  if (!data.place) {
    return;
  }

  data.place.contact = lineage.minifyLineage(data.contact);
  data.place.parent = lineage.minifyLineage(data.place.parent);

  return db.medic
    .get(data.place._id)
    .then(place => {
      place.contact = data.place.contact;
      place.parent = data.place.parent;

      return db.medic.put(place);
    })
    .catch(err => {
      if (err.status === 409 && retry < MAX_CONFLICT_RETRY) {
        return storeUpdatedPlace(data, retry + 1);
      }
      throw err;
    });
};

const setContactParent = data => {
  if (!data.contact) {
    return;
  }

  const contactId = getDocID(data.contact);
  if (contactId) {
    // assigning to existing contact
    const placeId = getDocID(data.place);
    return validateContact(contactId, placeId)
      .catch(err => {
        if (err.status !== 404) {
          return Promise.reject(err);
        }
        // try creating the user
        data.contact.parent = lineage.minifyLineage(data.place);
      });
  }
  if (data.contact.parent) {
    // contact parent must exist
    return places.getPlace(data.contact.parent)
      .then(place => {
        if (!module.exports._hasParent(place, data.place)) {
          return Promise.reject(error400('Contact is not within place.','configuration.user.place.contact'));
        }
        // save result to contact object
        data.contact.parent = lineage.minifyLineage(place);
      });
  }
  // creating new contact
  data.contact.parent = lineage.minifyLineage(data.place);
};

const hasParent = (facility, id) => {
  // do not modify facility
  let p = facility;
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
const mapUsers = (users, settings, facilities) => {
  users = users || [];
  return users
    .filter(user => user.id.indexOf(USER_PREFIX) === 0)
    .map(user => {
      const setting = getDoc(user.id, settings) || {};
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

const getSettingsUpdates = (username, data) => {
  const ignore = ['type', 'place', 'contact'];

  const settings = {
    name: username,
    type: 'user-settings'
  };

  SETTINGS_EDITABLE_FIELDS.forEach(key => {
    if (!_.isUndefined(data[key]) && ignore.indexOf(key) === -1) {
      settings[key] = data[key];
    }
  });

  if (data.type) {
    // deprecated: use 'roles' instead
    settings.roles = getRoles(data.type);
  }
  if (settings.roles) {
    const index = settings.roles.indexOf(ONLINE_ROLE);
    if (auth.isOffline(settings.roles)) {
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

const getUserUpdates = (username, data) => {
  const ignore = ['type', 'place'];

  const user = {
    name: username,
    type: 'user'
  };

  USER_EDITABLE_FIELDS.forEach(key => {
    if (!_.isUndefined(data[key]) && ignore.indexOf(key) === -1) {
      user[key] = data[key];
    }
  });

  if (data.type) {
    // deprecated: use 'roles' instead
    user.roles = getRoles(data.type);
  }
  if (user.roles && !auth.isOffline(user.roles)) {
    user.roles.push(ONLINE_ROLE);
  }
  if (data.place) {
    user.facility_id = getDocID(data.place);
  }

  return user;
};

const createID = name => USER_PREFIX + name;

const deleteUser = id => {
  // Potential problem here where _users database update happens but medic
  // update fails and user is in inconsistent state. There is no way to do
  // atomic update on more than one database with CouchDB API.

  const usersDbPromise = db.users.get(id).then(user => {
    user._deleted = true;
    return db.users.put(user);
  });
  const medicDbPromise = db.medic.get(id).then(user => {
    user.inactive = true;
    user.deletion_date = moment().utc().valueOf();
    return db.medic.put(user);
  });
  return Promise.all([ usersDbPromise, medicDbPromise ]);
};

const validatePassword = password => {
  if (password.length < PASSWORD_MINIMUM_LENGTH) {
    return error400(
      `The password must be at least ${PASSWORD_MINIMUM_LENGTH} characters long.`,
      'password.length.minimum',
      { 'minimum': PASSWORD_MINIMUM_LENGTH }
    );
  }
  if (passwordTester(password) < PASSWORD_MINIMUM_SCORE) {
    return error400(
      'The password is too easy to guess. Include a range of types of characters to increase the score.',
      'password.weak'
    );
  }
};

const missingFields = data => {
  const required = ['username', 'password'];
  if (data.roles && auth.isOffline(data.roles)) {
    required.push('place', 'contact');
  }

  const missing = required.filter(prop => !data[prop]);

  if (!data.type && !data.roles) {
    missing.push('type or roles');
  }

  return missing;
};

const getUpdatedUserDoc = (username, data) => {
  const userID = createID(username);
  return module.exports._validateUser(userID).then(doc => {
    const user = Object.assign(doc, module.exports._getUserUpdates(username, data));
    user._id = userID;
    return user;
  });
};

const getUpdatedSettingsDoc = (username, data) => {
  const userID = createID(username);
  return module.exports._validateUserSettings(userID).then(doc => {
    const settings = Object.assign(doc, module.exports._getSettingsUpdates(username, data));
    settings._id = userID;
    return settings;
  });
};

/*
 * Everything not exported directly is private.  Underscore prefix is only used
 * to export functions needed for testing.
 */
module.exports = {
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
  _validateContact: validateContact,
  _validateNewUsername: validateNewUsername,
  _validateUser: validateUser,
  _validateUserSettings: validateUserSettings,
  deleteUser: username => deleteUser(createID(username)),
  getList: () => {
    return Promise.all([
      module.exports._getAllUsers(),
      module.exports._getAllUserSettings(),
      module.exports._getFacilities()
    ])
      .then(([ users, settings, facilities ]) => {
        return mapUsers(users, settings, facilities);
      });
  },
  /*
   * Take the request data and create valid user, user-settings and contact
   * objects. Returns the response body in the callback.
   *
   * @param {Object} data - request body
   * @api public
   */
  createUser: data => {
    const missing = missingFields(data);
    if (missing.length > 0) {
      return Promise.reject(error400(
        'Missing required fields: ' + missing.join(', '),
        'fields.required',
        { 'fields': missing.join(', ') }
      ));
    }
    const passwordError = validatePassword(data.password);
    if (passwordError) {
      return Promise.reject(passwordError);
    }
    const response = {};
    return module.exports._validateNewUsername(data.username)
      .then(() => module.exports._createPlace(data))
      .then(() => module.exports._setContactParent(data))
      .then(() => module.exports._createContact(data, response))
      .then(() => module.exports._storeUpdatedPlace(data))
      .then(() => module.exports._createUser(data, response))
      .then(() => module.exports._createUserSettings(data, response))
      .then(() => response);
  },

  /*
  * Take the userCtx of an admin user and create the _user doc and user-settings doc
  */
  createAdmin: userCtx => {
    const data = { username: userCtx.name, roles: ['admin'] };
    return module.exports
      ._validateNewUsername(userCtx.name)
      .then(() => module.exports._createUser(data, {}))
      .then(() => module.exports._createUserSettings(data, {}));
  },

  /**
   * Updates the given user.
   *
   * If fullAccess is passed as false we should restrict them from updating
   * anything that elevates or changes their privilege (such as roles or
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
   */
  updateUser: (username, data, fullAccess) => {
    // Reject update attempts that try to modify data they're not allowed to
    if (!fullAccess) {
      const illegalAttempts = illegalDataModificationAttempts(data);
      if (illegalAttempts.length) {
        const err = Error('You do not have permission to modify: ' + illegalAttempts.join(','));
        err.status = 401;
        return Promise.reject(err);
      }
    }

    const props = _.uniq(USER_EDITABLE_FIELDS.concat(SETTINGS_EDITABLE_FIELDS));

    // Online users can remove place or contact
    if (!_.isNull(data.place) &&
        !_.isNull(data.contact) &&
        !_.some(props, key => (!_.isNull(data[key]) && !_.isUndefined(data[key])))
    ) {
      return Promise.reject(error400(
        'One of the following fields are required: ' + props.join(', '),
        'fields.one.required',
        { 'fields': props.join(', ') }
      ));
    }
    if (data.password) {
      const passwordError = validatePassword(data.password);
      if (passwordError) {
        return Promise.reject(passwordError);
      }
    }

    return Promise.all([
      getUpdatedUserDoc(username, data),
      getUpdatedSettingsDoc(username, data),
    ])
      .then(([ user, settings ]) => {
        const response = {};

        return Promise.resolve()
          .then(() => {
            if (data.place) {
              settings.facility_id = user.facility_id;
              return places.getPlace(user.facility_id);
            } else if (_.isNull(data.place)) {
              if (settings.roles && auth.isOffline(settings.roles)) {
                return Promise.reject(error400(
                  'Place field is required for offline users',
                  'field is required',
                  {'field': 'Place'}
                ));
              }
              user.facility_id = null;
              settings.facility_id = null;
            }
          })
          .then(() => {
            if (data.contact) {
              return module.exports._validateContact(settings.contact_id, user.facility_id);
            } else if (_.isNull(data.contact)) {
              if (settings.roles && auth.isOffline(settings.roles)) {
                return Promise.reject(error400(
                  'Contact field is required for offline users',
                  'field is required',
                  {'field': 'Contact'}
                ));
              }
              settings.contact_id = null;
            }
          })
          .then(() => db.users.put(user))
          .then(resp => {
            response.user = {
              id: resp.id,
              rev: resp.rev
            };
          })
          .then(() => db.medic.put(settings))
          .then(resp => {
            response['user-settings'] = {
              id: resp.id,
              rev: resp.rev
            };
          })
          .then(() => response);
      });
  },

  DOC_IDS_WARN_LIMIT
};
