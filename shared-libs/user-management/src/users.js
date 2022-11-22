const _ = require('lodash');
const passwordTester = require('simple-password-tester');
const db = require('./libs/db');
const lineage = require('./libs/lineage');
const couchSettings = require('@medic/settings');
const getRoles = require('./libs/types-and-roles');
const roles = require('./roles');
const tokenLogin = require('./token-login');
const config = require('./libs/config');
const moment = require('moment');
const bulkUploadLog = require('./bulk-upload-log');
const passwords = require('./libs/passwords');
const { people, places } = require('@medic/contacts')(config, db);

const USER_PREFIX = 'org.couchdb.user:';

const PASSWORD_MINIMUM_LENGTH = 8;
const PASSWORD_MINIMUM_SCORE = 50;
const USERNAME_WHITELIST = /^[a-z0-9_-]+$/;

const MAX_CONFLICT_RETRY = 3;

const BULK_UPLOAD_STATUSES = {
  IMPORTED: 'imported',
  SKIPPED: 'skipped',
  ERROR: 'error',
};
const BULK_UPLOAD_PROGRESS_STATUSES = {
  PARSING: 'parsing',
  PARSED: 'parsed',
  ERROR: 'error',
  SAVING: 'saving',
  FINISHED: 'finished',
};
const BULK_UPLOAD_RESERVED_COLS = {
  IMPORT_STATUS: 'import.status:excluded',
  IMPORT_MESSAGE: 'import.message:excluded',
};

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

// No longer used, but allowed for backwards compatibility
const LEGACY_FIELDS = ['language'];

const ALLOWED_RESTRICTED_EDITABLE_FIELDS =
  RESTRICTED_SETTINGS_EDITABLE_FIELDS.concat(RESTRICTED_USER_EDITABLE_FIELDS, META_FIELDS);

const illegalDataModificationAttempts = data =>
  Object.keys(data).filter(k => !ALLOWED_RESTRICTED_EDITABLE_FIELDS.concat(LEGACY_FIELDS).includes(k));

/*
 * Set error codes to 400 to minimize 500 errors and stacktraces in the logs.
 */
const error400 = (msg, key, params) => {
  const error = new Error(msg);
  error.code = 400;

  if (typeof key === 'string') {
    return Object.assign(error, {
      message: { message: msg, translationKey: key, translationParams: params },
    });
  }

  return Object.assign(error, { details: key });
};

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
        return Promise.reject(error400('Wrong type, contact is not a person.', 'contact.type.wrong'));
      }
      if (!hasParent(doc, placeID)) {
        return Promise.reject(error400('Contact is not within place.', 'configuration.user.place.contact'));
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

/**
 * Resolves successfully if the username is valid and available (not used by another user). Otherwise, rejects.
 */
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

const storeUpdatedPlace = (data, preservePrimaryContact, retry = 0) => {
  if (!data.place) {
    return;
  }

  data.place.contact = lineage.minifyLineage(data.contact);
  data.place.parent = lineage.minifyLineage(data.place.parent);

  return db.medic
    .get(data.place._id)
    .then(place => {
      if (preservePrimaryContact) {
        return;
      }
      place.contact = data.place.contact;
      place.parent = data.place.parent;
      return db.medic.put(place);
    })
    .catch(err => {
      if (err.status === 409 && retry < MAX_CONFLICT_RETRY) {
        return storeUpdatedPlace(data, preservePrimaryContact, retry + 1);
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
          return Promise.reject(error400('Contact is not within place.', 'configuration.user.place.contact'));
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
    const index = settings.roles.indexOf(roles.ONLINE_ROLE);
    if (roles.isOffline(settings.roles)) {
      if (index !== -1) {
        // remove the online role
        settings.roles.splice(index, 1);
      }
    } else if (index === -1) {
      // add the online role
      settings.roles.push(roles.ONLINE_ROLE);
    }
  }
  if (data.place) {
    settings.facility_id = getDocID(data.place);
  }
  if (data.contact) {
    settings.contact_id = getDocID(data.contact);
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
  if (user.roles && !roles.isOffline(user.roles)) {
    user.roles.push(roles.ONLINE_ROLE);
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
    user.deletion_date = moment().valueOf();
    return db.medic.put(user);
  });
  return Promise.all([ usersDbPromise, medicDbPromise ]);
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

const missingFields = data => {
  const required = ['username'];

  if (tokenLogin.shouldEnableTokenLogin(data)) {
    required.push('phone');
  } else {
    required.push('password');
  }

  if (data.roles && roles.isOffline(data.roles)) {
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

const isDbAdmin = user => {
  return couchSettings
    .getCouchConfig('admins')
    .then(admins => admins && !!admins[user.name]);
};

const saveUserUpdates = async (user) => {
  const savedDoc = await db.users.put(user);

  if (user.password && await isDbAdmin(user)) {
    await couchSettings.updateAdminPassword(user.name, user.password);
  }

  return {
    id: savedDoc.id,
    rev: savedDoc.rev
  };
};

const saveUserSettingsUpdates = async (userSettings) => {
  const savedDoc = await db.medic.put(userSettings);

  return {
    id: savedDoc.id,
    rev: savedDoc.rev
  };
};

const validateUserFacility = (data, user, userSettings) => {
  if (data.place) {
    userSettings.facility_id = user.facility_id;
    return places.getPlace(user.facility_id);
  }

  if (_.isNull(data.place)) {
    if (userSettings.roles && roles.isOffline(userSettings.roles)) {
      return Promise.reject(error400(
        'Place field is required for offline users',
        'field is required',
        {'field': 'Place'}
      ));
    }
    user.facility_id = null;
    userSettings.facility_id = null;
  }
};

const validateUserContact = (data, user, userSettings) => {
  if (data.contact) {
    return validateContact(userSettings.contact_id, user.facility_id);
  }

  if (_.isNull(data.contact)) {
    if (userSettings.roles && roles.isOffline(userSettings.roles)) {
      return Promise.reject(error400(
        'Contact field is required for offline users',
        'field is required',
        {'field': 'Contact'}
      ));
    }
    userSettings.contact_id = null;
  }
};

/* eslint-disable max-len */
/**
 * @param {Object} data
 * @param {string} data.username Identifier used for authentication
 * @param {string[]} data.roles
 * @param {(Object|string)=} data.place Place identifier string (UUID) or object this user resides in. Required if the roles contain an offline role.
 * @param {(Object|string)=} data.contact A person identifier string (UUID) or object based on the form configured in the app. Required if the roles contain an offline role.
 * @param {string=} data.password Password string used for authentication. Only allowed to be set, not retrieved. Required if token_login is not enabled for the user.
 * @param {string=} data.phone Valid phone number. Required if token_login is enabled for the user.
 * @param {Boolean=} data.token_login A boolean representing whether or not the Login by SMS should be enabled for this user.
 * @param {string=} data.fullname Full name
 * @param {string=} data.email Email address
 * @param {Boolean=} data.known Boolean to define if the user has logged in before. Used mainly to determine whether or not to start a tour on first login.
 * @param {string=} data.type Deprecated. Used to infer user's roles
 * @param {string} appUrl request protocol://hostname
 */
/* eslint-enable max-len */
const createUserEntities = async (data, appUrl) => {
  // Preserve the place's primary contact, if data.place already exists in the DB.
  // => if we're creating the place alongside the user, set the contact as the place's primary contact
  const preservePrimaryContact = !(_.isObject(data.place) && !data.place._rev);

  const response = {};
  await validateNewUsername(data.username);
  await createPlace(data);
  await setContactParent(data);
  await createContact(data, response);
  await storeUpdatedPlace(data, preservePrimaryContact);
  await createUser(data, response);
  await createUserSettings(data, response);
  await tokenLogin.manageTokenLogin(data, appUrl, response);
  return response;
};

const assignCsvCellValue = (data, attribute, value) => {
  attribute = (attribute || '').trim();
  if (!attribute.length || attribute.toLowerCase().indexOf(':excluded') > 0) {
    return;
  }

  if (typeof value !== 'string') {
    data[attribute] = value;
    return;
  }

  data[attribute] = value.replace(/^"|"$/g, '').trim();

  if (['TRUE', 'FALSE'].includes(data[attribute])) {
    // converts the "TRUE" or "FALSE" string to boolean
    data[attribute] = eval(data[attribute].toLowerCase());
  }
};

const parseCsvRow = (data, header, value, valueIdx) => {
  const deepAttributes = header[valueIdx].split('.');
  if (deepAttributes.length === 1) {
    assignCsvCellValue(data, deepAttributes[0], value);
    return;
  }

  let deepObject = data;
  deepAttributes.forEach((attr, idx) => {
    if (idx === deepAttributes.length - 1) {
      return assignCsvCellValue(deepObject, attr, value);
    }

    if (!deepObject[attr]) {
      assignCsvCellValue(deepObject, attr, {});
    }
    deepObject = deepObject[attr];
  });

  return data;
};

const parseCsv = async (csv, logId) => {
  if (!csv || !csv.length) {
    throw new Error('CSV is empty.');
  }

  let allRows = csv.split(/\r\n|\n/);
  const header = allRows
    .shift()
    .split(',');
  allRows = allRows.filter(row => row.length);

  const progress = {
    status: BULK_UPLOAD_PROGRESS_STATUSES.PARSING,
    parsing: { total: allRows.length, failed: 0, successful: 0 }
  };
  const logData = [];
  await bulkUploadLog.updateLog(logId, progress);

  const users = [];
  const ignoredUsers = {};
  for (let rowIdx = 0; rowIdx < allRows.length; rowIdx++) {
    let ignoreUser = false;
    let ignoreMessage = '';
    const user = {};
    try {
      allRows[rowIdx]
        .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
        .forEach((value, idx) => {
          const ignoreStatus = [BULK_UPLOAD_STATUSES.IMPORTED, BULK_UPLOAD_STATUSES.SKIPPED];
          if (header[idx].toLowerCase() === BULK_UPLOAD_RESERVED_COLS.IMPORT_STATUS
            && ignoreStatus.indexOf(value.toLowerCase()) > -1) {
            ignoreUser = true;
          }
          if (header[idx].toLowerCase() === BULK_UPLOAD_RESERVED_COLS.IMPORT_MESSAGE) {
            ignoreMessage = value;
            return;
          }
          parseCsvRow(user, header, value, idx);
        });
      progress.parsing.successful++;
      logData.push(createRecordBulkLog(user, BULK_UPLOAD_PROGRESS_STATUSES.PARSED));
    } catch (error) {
      progress.parsing.failed++;
      logData.push(createRecordBulkLog(user, BULK_UPLOAD_PROGRESS_STATUSES.ERROR, error));
    }

    if (rowIdx % 10) {
      await bulkUploadLog.updateLog(logId, progress, logData);
    }

    users.push(user);
    if (ignoreUser) {
      ignoredUsers[user.username] = { user, ignoreMessage };
    }
  }

  progress.status = BULK_UPLOAD_PROGRESS_STATUSES.PARSED;
  await bulkUploadLog.updateLog(logId, progress, logData);
  return { users, ignoredUsers };
};

const createRecordBulkLog = (record, status, error, message) => {
  if (error) {
    message = typeof error.message === 'object' ? error.message.message : error.message;
  }

  if (!message) {
    message = status + ' on ' + new Date().toISOString();
  }

  const meta = {
    import: {
      status,
      message,
    }
  };
  const recordBulkLog = Object.assign({}, record, meta);
  delete recordBulkLog.password;
  return recordBulkLog;
};

const hydrateUserSettings = (userSettings) => {
  return db.medic
    .allDocs({ keys: [ userSettings.facility_id, userSettings.contact_id ], include_docs: true })
    .then((response) => {
      if (!Array.isArray(response.rows) || response.rows.length !== 2) { // malformed response
        return userSettings;
      }

      const [facilityRow, contactRow] = response.rows;
      if (!facilityRow || !contactRow) { // malformed response
        return userSettings;
      }

      userSettings.facility = facilityRow.doc;
      userSettings.contact = contactRow.doc;

      return userSettings;
    });
};

const getUserDoc = (username, dbName) => db[dbName]
  .get(`org.couchdb.user:${username}`)
  .catch(err => {
    err.db = dbName;
    throw err;
  });

const getUserDocsByName = (name) =>
  Promise
    .all(['users', 'medic'].map(dbName => getUserDoc(name, dbName)))
    .catch(error => {
      if (error.status !== 404) {
        return Promise.reject(error);
      }
      return Promise.reject({
        status: 404,
        message: `Failed to find user with name [${name}] in the [${error.db}] database.`
      });
    });

const getUserSettings = async({ name }) => {
  const [ user, medicUser ] = await getUserDocsByName(name);
  Object.assign(medicUser, _.pick(user, 'name', 'roles', 'facility_id'));
  return hydrateUserSettings(medicUser);
};

/*
 * Everything not exported directly is private.  Underscore prefix is only used
 * to export functions needed for testing.
 */
module.exports = {
  deleteUser: username => deleteUser(createID(username)),
  getList: () => {
    return Promise
      .all([
        getAllUsers(),
        getAllUserSettings(),
        getFacilities()
      ])
      .then(([ users, settings, facilities ]) => {
        return mapUsers(users, settings, facilities);
      });
  },
  getUserSettings,
  /* eslint-disable max-len */
  /**
   * Take the request data and create valid user, user-settings and contact
   * objects. Returns the response body in the callback.
   *
   * @param {Object} data
   * @param {string} data.username Identifier used for authentication
   * @param {string[]} data.roles
   * @param {(Object|string)=} data.place Place identifier string (UUID) or object this user resides in. Required if the roles contain an offline role.
   * @param {(Object|string)=} data.contact A person identifier string (UUID) or object based on the form configured in the app. Required if the roles contain an offline role.
   * @param {string=} data.password Password string used for authentication. Only allowed to be set, not retrieved. Required if token_login is not enabled for the user.
   * @param {string=} data.phone Valid phone number. Required if token_login is enabled for the user.
   * @param {Boolean=} data.token_login A boolean representing whether or not the Login by SMS should be enabled for this user.
   * @param {string=} data.fullname Full name
   * @param {string=} data.email Email address
   * @param {Boolean=} data.known Boolean to define if the user has logged in before. Used mainly to determine whether or not to start a tour on first login.
   * @param {string=} data.type Deprecated. Used to infer user's roles
   * @param {string} appUrl request protocol://hostname
   * @api public
   */
  /* eslint-enable max-len */
  createUser: async (data, appUrl) => {
    const missing = missingFields(data);
    if (missing.length > 0) {
      return Promise.reject(error400(
        'Missing required fields: ' + missing.join(', '),
        'fields.required',
        { 'fields': missing.join(', ') }
      ));
    }

    const tokenLoginError = tokenLogin.validateTokenLogin(data, true);
    if (tokenLoginError) {
      return Promise.reject(error400(tokenLoginError.msg, tokenLoginError.key));
    }
    const passwordError = validatePassword(data.password);
    if (passwordError) {
      return Promise.reject(passwordError);
    }

    return await createUserEntities(data, appUrl);
  },

  /* eslint-disable max-len */
  /**
   * Take the request data and create valid users, user-settings and contacts
   * objects. Returns the response body in the callback.
   *
   * @param {Object|Object[]} users[]
   * @param {string} users[].username Identifier used for authentication
   * @param {string[]} users[].roles
   * @param {(Object|string)=} users[].place Place identifier string (UUID) or object this user resides in. Required if the roles contain an offline role.
   * @param {(Object|string)=} users[].contact A person identifier string (UUID) or object based on the form configured in the app. Required if the roles contain an offline role.
   * @param {string=} users[].password Password string used for authentication. Only allowed to be set, not retrieved. Required if token_login is not enabled for the user.
   * @param {string=} users[].phone Valid phone number. Required if token_login is enabled for the user.
   * @param {Boolean=} users[].token_login A boolean representing whether or not the Login by SMS should be enabled for this user.
   * @param {string=} users[].fullname Full name
   * @param {string=} users[].email Email address
   * @param {Boolean=} users[].known Boolean to define if the user has logged in before. Used mainly to determine whether or not to start a tour on first login.
   * @param {string=} users[].type Deprecated. Used to infer user's roles
   * @param {string} appUrl request protocol://hostname
   */
  /* eslint-enable max-len */
  async createUsers(users, appUrl, ignoredUsers, logId) {
    if (!Array.isArray(users)) {
      return module.exports.createUser(users, appUrl);
    }

    const progress = {
      status: BULK_UPLOAD_PROGRESS_STATUSES.SAVING,
      saving: { total: users.length, failed: 0, successful: 0, ignored: 0 }
    };
    const logData = [];
    await bulkUploadLog.updateLog(logId, progress);

    const responses = [];
    for (let userIdx = 0; userIdx < users.length; userIdx++) {
      const user = users[userIdx];
      let response;

      if (ignoredUsers && ignoredUsers[user.username]) {
        progress.saving.ignored++;
        const log = createRecordBulkLog(
          user,
          BULK_UPLOAD_STATUSES.SKIPPED,
          null,
          ignoredUsers[user.username].ignoreMessage
        );
        logData.push(log);
        continue;
      }

      try {
        const missing = missingFields(user);
        if (missing.length > 0) {
          throw new Error('Missing required fields: ' + missing.join(', '));
        }

        const tokenLoginError = tokenLogin.validateTokenLogin(user, true);
        if (tokenLoginError) {
          throw new Error(tokenLoginError.msg);
        }

        const passwordError = validatePassword(user.password);
        if (passwordError) {
          throw passwordError;
        }

        response = await createUserEntities(user, appUrl);
        progress.saving.successful++;
        logData.push(createRecordBulkLog(user, BULK_UPLOAD_STATUSES.IMPORTED));
      } catch(error) {
        response = { error: error.message };
        progress.saving.failed++;
        logData.push(createRecordBulkLog(user, BULK_UPLOAD_STATUSES.ERROR, error));
      }

      if (userIdx % 10) {
        await bulkUploadLog.updateLog(logId, progress, logData);
      }

      responses.push(response);
    }

    progress.status = BULK_UPLOAD_PROGRESS_STATUSES.FINISHED;
    await bulkUploadLog.updateLog(logId, progress, logData);
    return responses;
  },

  /*
  * Take the userCtx of an admin user and create the _user doc and user-settings doc
  * if they do not already exist.
  */
  createAdmin: userCtx => {
    return validateUser(createID(userCtx.name))
      .catch(err => {
        if (err && err.status === 404) {
          const data = { username: userCtx.name, roles: ['admin'] };
          return validateNewUsername(userCtx.name)
            .then(() => createUser(data, {}))
            .then(() => createUserSettings(data, {}));
        }
        return Promise.reject(err);
      });
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
   * @param      {String}    appUrl      request protocol://hostname
   */
  updateUser: async (username, data, fullAccess, appUrl) => {
    // Reject update attempts that try to modify data they're not allowed to
    if (!fullAccess) {
      const illegalAttempts = illegalDataModificationAttempts(data);
      if (illegalAttempts.length) {
        const err = Error('You do not have permission to modify: ' + illegalAttempts.join(','));
        err.status = 401;
        return Promise.reject(err);
      }
    }

    const props = _.uniq(USER_EDITABLE_FIELDS.concat(SETTINGS_EDITABLE_FIELDS, META_FIELDS, LEGACY_FIELDS));

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

    const [user, userSettings] = await Promise.all([
      getUpdatedUserDoc(username, data),
      getUpdatedSettingsDoc(username, data),
    ]);

    const tokenLoginError = tokenLogin.validateTokenLogin(data, false, user, userSettings);
    if (tokenLoginError) {
      return Promise.reject(error400(tokenLoginError.msg, tokenLoginError.key));
    }

    await validateUserFacility(data, user, userSettings);
    await validateUserContact(data, user, userSettings);
    const response = {
      user: await saveUserUpdates(user),
      'user-settings': await saveUserSettingsUpdates(userSettings),
    };

    return tokenLogin.manageTokenLogin(data, appUrl, response);
  },

  /**
   * Updates the user with a new random password. Returns this password.
   * @param {string} username the username of the user to update
   * @returns {Promise<string>} the generated password
   */
  resetPassword: async (username) => {
    const password = passwords.generate();
    const user = await getUpdatedUserDoc(username, { password });
    await saveUserUpdates(user);
    return password;
  },

  validateNewUsername,

  /**
   * Parses a CSV of users to an array of objects.
   *
   * @param {string} csv CSV of users.
   */
  parseCsv,
};
