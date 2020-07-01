const _ = require('lodash');
const passwordTester = require('simple-password-tester');
const crypto = require('crypto');
const people  = require('../controllers/people');
const places = require('../controllers/places');
const db = require('../db');
const lineage = require('@medic/lineage')(Promise, db.medic);
const getRoles = require('./types-and-roles');
const auth = require('../auth');
const config = require('../config');
const phoneNumber = require('@medic/phone-number');
const taskUtils = require('@medic/task-utils');

const USER_PREFIX = 'org.couchdb.user:';
const ONLINE_ROLE = 'mm-online';
const DOC_IDS_WARN_LIMIT = 10000;

const LOGIN_TOKEN_EXPIRE_TIME = 24 * 60 * 60 * 1000; // 24 hours

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

const META_FIELDS = ['token_login'];

const ALLOWED_RESTRICTED_EDITABLE_FIELDS =
  RESTRICTED_SETTINGS_EDITABLE_FIELDS.concat(RESTRICTED_USER_EDITABLE_FIELDS, META_FIELDS);

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
      if (!hasParent(doc, placeID)) {
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
        if (!hasParent(place, data.place)) {
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
    user._deleted = true;
    return db.medic.put(user);
  });
  return Promise.all([ usersDbPromise, medicDbPromise ]);
};

const genPassword = (length = PASSWORD_MINIMUM_LENGTH) => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let password;
  do {
    password = Array.from({ length }).map(() => _.sample(chars)).join('');
  } while (passwordTester(password) < PASSWORD_MINIMUM_SCORE);

  return password;
};

const validatePassword = (password) => {
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

const validateAndNormalizePhone = (data) => {
  const settings = config.get();
  if (!phoneNumber.validate(settings, data.phone)) {
    return error400(
      'A valid phone number is required for SMS login.',
      'configuration.enable.token.login.phone'
    );
  }

  data.phone = phoneNumber.normalize(settings, data.phone);
};

const missingFields = data => {
  const required = ['username'];

  if (!shouldEnableTokenLogin(data)) {
    required.push('password');
  } else {
    required.push('phone');
  }

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
  return validateUser(userID).then(doc => {
    const user = Object.assign(doc, getUserUpdates(username, data));
    user._id = userID;
    return user;
  });
};

const getUpdatedSettingsDoc = (username, data) => {
  const userID = createID(username);
  return validateUserSettings(userID).then(doc => {
    const settings = Object.assign(doc, getSettingsUpdates(username, data));
    settings._id = userID;
    return settings;
  });
};

const shouldEnableTokenLogin = data => {
  const tokenLoginConfig = config.get('token_login');
  const isValidConfig = tokenLoginConfig &&
                        (tokenLoginConfig.translation_key || tokenLoginConfig.message) &&
                        tokenLoginConfig.app_url;
  if (!isValidConfig) {
    return false;
  }

  return data.token_login;
};
const shouldDisableTokenLogin = data => data.token_login === false;

const getHash = string => crypto.createHash('sha1').update(string, 'utf8').digest('hex');

/**
 * Clears pending tasks in the currently assigned `token_login_sms` doc
 * Used to either disable or refresh token-login
 *
 * @param {Object} user - the _users doc
 * @param {Object} user.token_login - token-login information
 * @param {Boolean} user.token_login.active - whether the token-login is active or not
 * @param {String} user.token_login.doc_id - the id of the current `token_login_sms`
 * @returns {Promise<void>|*}
 */
const clearOldLoginSms = (user) => {
  if (!user.token_login || !user.token_login.active || !user.token_login.doc_id) {
    return Promise.resolve();
  }

  return db.medic
    .get(user.token_login.doc_id)
    .then(doc => {
      if (doc && doc.tasks) {
        const pendingTasks = doc.tasks.filter(task => task.state === 'pending');
        if (!pendingTasks.length) {
          return;
        }

        pendingTasks.forEach(task => taskUtils.setTaskState(task, 'cleared'));
        return db.medic.put(doc);
      }
    })
    .catch(err => {
      if (err.status === 404) {
        return;
      }
      throw err;
    });
};

/**
 * Generates a doc of type `token_login_sms` that contains the two tasks required for token login: one reserved
 * for the URL and one containing instructions for the user.
 * If the user already had token-login activated, the pending tasks of the existent `token_login_sms` doc are cleared.
 * @param {Object} user - the _users document
 * @param {Object} userSettings - the user-settings document from the main database
 * @param {String} token - the randomly generated token
 * @param {String} userHash - sha1 hash of the user's document id
 * @param {Object} tokenLoginConfig - the token_login config section that contains the translation_key used to generate
 *                                    the instructions sms message
 * @returns {Promise<Object>} - returns the result of saving the new token_login_sms document
 */
const generateLoginSms = (user, userSettings, token, userHash, tokenLoginConfig) => {
  return clearOldLoginSms(user).then(() => {
    const doc = {
      type: 'token_login_sms',
      reported_date: new Date().getTime(),
      user: user._id,
      tasks: [],
    };
    const userHash = getHash(user._id);
    const url = `${tokenLoginConfig.app_url}/medic/login/token/${token}/${userHash}`;

    const messagesLib = config.getTransitionsLib().messages;

    const context = { templateContext: Object.assign({}, userSettings, user) };
    messagesLib.addMessage(doc, tokenLoginConfig, userSettings.phone, context);
    messagesLib.addMessage(doc, { message: url }, userSettings.phone);

    return db.medic.post(doc);
  });
};

/**
 * Enables or disables token-login for a user
 * When enabling, if `token-login` configuration is missing or invalid, no changes are made.
 * @param {Object} response - the response of previous actions
 * @returns {Promise<{Object}>} - updated response to be sent to the client
 */
const manageTokenLogin = (data, response) => {
  if (shouldDisableTokenLogin(data)) {
    return disableTokenLogin(response);
  }

  if (!shouldEnableTokenLogin(data)) {
    return Promise.resolve(response);
  }

  return enableTokenLogin(response);
};

/**
 * Enables token-login for a user
 * - a new document is created in the `medic` database that contains tasks (SMSs) to be sent to the phone number
 *   belonging to the current user (userSettings.phone) that contain instructions and a url to login in the app
 * - if the user already had token-login enabled, the previous sms document's tasks are cleared
 * - updates the user document to contain information about the active `token-login` context for the user
 * - updates the user-settings document to contain some information to be displayed in the admin page
 * @param {Object} response - the response of previous actions
 * @returns {Promise<{Object}>} - updated response to be sent to the client
 */
const enableTokenLogin = (response) => {
  const tokenLoginConfig = config.get('token_login');

  return Promise
    .all([
      validateUser(response.user.id),
      validateUserSettings(response['user-settings'].id),
    ])
    .then(([ user, userSettings ]) => {
      const token = genPassword(50);
      const hash = getHash(user._id);

      return generateLoginSms(user, userSettings, token, hash, tokenLoginConfig)
        .then(result => {
          user.token_login = {
            active: true,
            token,
            hash,
            expiration_date: new Date().getTime() + LOGIN_TOKEN_EXPIRE_TIME,
            doc_id: result.id
          };

          userSettings.token_login = {
            active: true,
            expiration_date: user.token_login.expiration_date,
          };

          response.token_login = {
            id: result.id,
            expiration_date: user.token_login.expiration_date,
          };

          return Promise.all([ db.users.put(user), db.medic.put(userSettings) ]);
        });
    })
    .then(() => response);
};

/**
 * Disables token-login for a user.
 * Deletes the `token_login` properties from the user and userSettings doc.
 * Clears pending tasks in existent SMSs
 *
 * @param {Object} response - the response of previous actions
 * @returns {Promise<{Object}>} - updated response to be sent to the client
 */
const disableTokenLogin = (response) => {
  return Promise
    .all([
      validateUser(response.user.id),
      validateUserSettings(response['user-settings'].id),
    ])
    .then(([ user, userSettings ]) => {
      if (!user.token_login) {
        return;
      }

      return clearOldLoginSms(user).then(() => {
        delete user.token_login;
        delete userSettings.token_login;

        return Promise.all([
          db.medic.put(userSettings),
          db.users.put(user),
        ]);
      });
    })
    .then(() => response);
};

/*
 * Everything not exported directly is private.  Underscore prefix is only used
 * to export functions needed for testing.
 */
module.exports = {
  deleteUser: username => deleteUser(createID(username)),
  getList: () => {
    return Promise.all([
      getAllUsers(),
      getAllUserSettings(),
      getFacilities()
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
    if (shouldEnableTokenLogin(data)) {
      // if token-login is requested, we will need to send sms-s to the user's phone number.
      const phoneError = validateAndNormalizePhone(data);
      if (phoneError) {
        return Promise.reject(phoneError);
      }
      data.password = genPassword(20);
    }
    const passwordError = validatePassword(data.password);
    if (passwordError) {
      return Promise.reject(passwordError);
    }
    const response = {};
    return validateNewUsername(data.username)
      .then(() => createPlace(data))
      .then(() => setContactParent(data))
      .then(() => createContact(data, response))
      .then(() => storeUpdatedPlace(data))
      .then(() => createUser(data, response))
      .then(() => createUserSettings(data, response))
      .then(() => manageTokenLogin(data, response))
      .then(() => response);
  },

  /*
  * Take the userCtx of an admin user and create the _user doc and user-settings doc
  */
  createAdmin: userCtx => {
    const data = { username: userCtx.name, roles: ['admin'] };
    return validateNewUsername(userCtx.name)
      .then(() => createUser(data, {}))
      .then(() => createUserSettings(data, {}));
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

    const props = _.uniq(USER_EDITABLE_FIELDS.concat(SETTINGS_EDITABLE_FIELDS, META_FIELDS));

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

    if (shouldEnableTokenLogin(data)) {
      data.password = genPassword(20);
    }

    if (data.password) {
      const passwordError = validatePassword(data.password);
      if (passwordError) {
        return Promise.reject(passwordError);
      }
    }

    return Promise
      .all([
        getUpdatedUserDoc(username, data),
        getUpdatedSettingsDoc(username, data),
      ])
      .then(([ user, settings ]) => {
        // when disabling token login for a user that had it enabled, setting a password is required
        if (shouldDisableTokenLogin(data) && user.token_login && !data.password) {
          return Promise.reject(validatePassword(''));
        }

        if (shouldEnableTokenLogin(data)) {
          // if token-login is requested, we will need to send sms-s to the user's phone number.
          const phoneError = validateAndNormalizePhone(settings);
          if (phoneError) {
            return Promise.reject(phoneError);
          }
        }

        const response = {};

        return Promise.resolve()
          .then(() => {
            if (data.place) {
              settings.facility_id = user.facility_id;
              return places.getPlace(user.facility_id);
            }

            if (_.isNull(data.place)) {
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
              return validateContact(settings.contact_id, user.facility_id);
            }

            if (_.isNull(data.contact)) {
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
          .then(() => manageTokenLogin(data, response))
          .then(() => response);
      });
  },

  DOC_IDS_WARN_LIMIT,

  /**
   * Searches for a user with active, not expired token-login that matches the requested token and hash.
   *
   * @param {String} token
   * @param {String} hash
   * @returns {Promise<string>} the id of the matched user
   */
  getUserByToken: (token, hash) => {
    if (!token || !hash) {
      return Promise.resolve(false);
    }

    return db.users.query('token-login/users-by-token', { key: [token, hash] }).then(response => {
      if (!response || !response.rows || !response.rows.length) {
        return false;
      }

      const row = response.rows[0];
      if (row.value.token_expiration_date <= new Date().getTime()) {
        return false;
      }

      return row.id;
    });
  },

  /**
   * Updates the user and userSettings docs when the token login link is accessed
   * Generates a new random password for the user.
   * @param {String} userId - the user's id to login via token link
   * @returns {*}
   */
  tokenLogin: userId => {
    return Promise
      .all([
        validateUser(userId),
        validateUserSettings(userId),
      ])
      .then(([ user, userSettings ]) => {
        if (!user.token_login || !user.token_login.active) {
          return Promise.reject({ code: 400, message: 'invalid user' });
        }

        const updates = {
          active: false,
          login_date: new Date().getTime(),
        };
        user.token_login = Object.assign(user.token_login, updates);
        userSettings.token_login = Object.assign(userSettings.token_login, updates);

        user.password = genPassword();
        console.log('generated password', user.password);

        return Promise
          .all([
            db.medic.put(userSettings),
            db.users.put(user),
          ])
          .then(() => ({ user: user.name, password: user.password }));
      });
  },
};
