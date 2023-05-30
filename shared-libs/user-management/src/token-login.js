const db = require('./libs/db');
const config = require('./libs/config');
const passwords = require('./libs/passwords');
const taskUtils = require('@medic/task-utils');
const phoneNumber = require('@medic/phone-number');
const TOKEN_EXPIRE_TIME = 24 * 60 * 60 * 1000; // 24 hours
const TOKEN_LENGTH = 64;

/**
 * Given user data, validates whether the phone field is filled with a valid phone number.
 * Throws an error if the phone number field is empty or value is not valid.
 * If valid, normalizes the field value.
 * @param {Object} data - the user data
 * @param {String} data.phone - the phone number to validate
 */
const validateAndNormalizePhone = (data) => {
  const settings = config.get();
  if (!phoneNumber.validate(settings, data.phone)) {
    return {
      msg: 'A valid phone number is required for SMS login.',
      key: 'configuration.enable.token.login.phone'
    };
  }

  data.phone = phoneNumber.normalize(settings, data.phone);
};

/**
 * Generates a unique 64 character token.
 * @returns {String}
 */
const generateToken = () => {
  const tokens = Array.from({ length: 10 }).map(() => passwords.generate(TOKEN_LENGTH));
  const docIds = tokens.map(token => getTokenLoginDocId(token));
  return db.medic.allDocs({ keys: docIds }).then(results => {
    const idx = results.rows.findIndex(row => row.error);
    if (idx === -1) {
      throw new Error('Failed to generate unique token');
    }
    return tokens[idx];
  });
};

/**
 * Enables token-login for a user
 * - a new document is created in the `medic` database that contains tasks (SMSs) to be sent to the phone number
 *   belonging to the current user (userSettings.phone) that contain instructions and a url to login in the app
 * - if the user already had token-login enabled, the previous sms document's tasks are cleared
 * - updates the user document to contain information about the active `token-login` context for the user
 * - updates the user-settings document to contain some information to be displayed in the admin page
 * @param {String} appUrl - the base URL of the application
 * @param {Object} response - the response of previous actions
 * @returns {Promise<{Object}>} - updated response to be sent to the client
 */
const enableTokenLogin = (appUrl, response) => {
  return Promise
    .all([
      db.users.get(response.user.id),
      db.medic.get(response['user-settings'].id),
      generateToken()
    ])
    .then(([ user, userSettings, token ]) => {
      return generateTokenLoginDoc(user, userSettings, token, appUrl)
        .then(() => {
          user.token_login = {
            active: true,
            token,
            expiration_date: new Date().getTime() + TOKEN_EXPIRE_TIME,
          };

          userSettings.token_login = {
            active: true,
            expiration_date: user.token_login.expiration_date,
          };

          response.token_login = { expiration_date: user.token_login.expiration_date };

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
      db.users.get(response.user.id),
      db.medic.get(response['user-settings'].id),
    ])
    .then(([ user, userSettings ]) => {
      if (!user.token_login) {
        return;
      }

      return clearOldTokenLoginDoc(user).then(() => {
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

/**
 * Enables or disables token-login for a user
 * When enabling, if `token-login` configuration is missing or invalid, no changes are made.
 * @param {Object} data - the request body
 * @param {String} appUrl - the base URL of the application
 * @param {Object} response - the response of previous actions
 * @returns {Promise<{Object}>} - updated response to be sent to the client
 */
const manageTokenLogin = (data, appUrl, response) => {
  if (shouldDisableTokenLogin(data)) {
    return disableTokenLogin(response);
  }

  if (!shouldEnableTokenLogin(data)) {
    return Promise.resolve(response);
  }

  return enableTokenLogin(appUrl, response);
};

const getTokenLoginDocId = token => `token:login:${token}`;

/**
 * Clears pending tasks in the currently assigned `token_login_sms` doc
 * Used to either disable or refresh token-login
 *
 * @param {Object} user - the _users doc
 * @param {Object} user.token_login - token-login information
 * @param {String} user.token_login.token - the current token
 * @returns {Promise}
 */
const clearOldTokenLoginDoc = ({ token_login: { token }={} }={}) => {
  if (!token) {
    return Promise.resolve();
  }

  return db.medic
    .get(getTokenLoginDocId(token))
    .then(doc => {
      if (!doc || !doc.tasks) {
        return;
      }

      const pendingTasks = doc.tasks.filter(task => task.state === 'pending');
      if (!pendingTasks.length) {
        return;
      }

      pendingTasks.forEach(task => taskUtils.setTaskState(task, 'cleared'));
      return db.medic.put(doc);
    })
    .catch(err => {
      if (err.status === 404) {
        return;
      }
      throw err;
    });
};

/**
 * Generates a doc of type `token_login` that contains the two tasks required for token login: one reserved
 * for the URL and one containing instructions for the user.
 * If the user already had token-login activated, the pending tasks of the existent `token_login` doc are cleared.
 * This `token_login` doc also connects the user to the token and is an admin-only editable doc.
 * @param {Object} user - the _users document
 * @param {Object} userSettings - the user-settings document from the main database
 * @param {String} token - the randomly generated token
 * @param {String} appUrl - the base URL of the application
 * @returns {Promise<Object>} - returns the result of saving the new token_login_sms document
 */
const generateTokenLoginDoc = (user, userSettings, token, appUrl) => {
  return clearOldTokenLoginDoc(user).then(() => {
    const doc = {
      _id: getTokenLoginDocId(token),
      type: 'token_login',
      reported_date: new Date().getTime(),
      user: user._id,
      tasks: [],
    };

    appUrl = (config.get('app_url') || appUrl).replace(/\/+$/, '');
    const url = `${appUrl}/medic/login/token/${token}`;

    const messagesLib = config.getTransitionsLib().messages;
    const tokenLoginConfig = config.get('token_login');
    const context = { templateContext: Object.assign({}, userSettings, user) };
    messagesLib.addMessage(doc, tokenLoginConfig, userSettings.phone, context);
    messagesLib.addMessage(doc, { message: url }, userSettings.phone);

    return db.medic.put(doc);
  });
};

const shouldEnableTokenLogin = data => isTokenLoginEnabled() && data.token_login === true;
const shouldDisableTokenLogin = data => data.token_login === false;

const isTokenLoginEnabled = () => {
  const tokenLoginConfig = config.get('token_login');
  return !!(tokenLoginConfig && tokenLoginConfig.enabled);
};

const validateTokenLoginCreate = (data) => {
  if (!shouldEnableTokenLogin(data)) {
    return;
  }

  // if token-login is requested, we will need to send sms-s to the user's phone number.
  const phoneError = validateAndNormalizePhone(data);
  if (phoneError) {
    return phoneError;
  }
  data.password = passwords.generate();
};

const validateTokenLoginEdit = (data, user, userSettings) => {
  if (shouldDisableTokenLogin(data) && user.token_login && !data.password) {
    // when disabling token login for a user that had it enabled, setting a password is required
    return {
      msg: 'Password is required when disabling token login.',
      key: 'password.length.minimum',
    };
  }

  if (shouldEnableTokenLogin(data)) {
    // if token-login is requested, we will need to send sms-s to the user's phone number.
    const phoneError = validateAndNormalizePhone(userSettings);
    if (phoneError) {
      return phoneError;
    }
    user.password = passwords.generate();
  }
};

const validateTokenLogin = (data, newUser = true, user = {}, userSettings = {}) => {
  if (newUser) {
    return validateTokenLoginCreate(data);
  }
  return validateTokenLoginEdit(data, user, userSettings);
};

/**
 * Searches for a user with active, not expired token-login that matches the requested token and user.
 *
 * @param {String} token
 * @returns {Promise<Object>} the id of the matched user
 */
const getUserByToken = (token) => {
  const invalid = { status: 401, error: 'invalid' };
  const expired = { status: 401, error: 'expired' };
  if (!token) {
    return Promise.reject(invalid);
  }

  const loginTokenDocId = getTokenLoginDocId(token);
  return db.medic
    .get(loginTokenDocId)
    .then(loginTokenDoc => db.users.get(loginTokenDoc.user))
    .then(user => {
      if (!user.token_login || !user.token_login.active) {
        throw invalid;
      }

      if (user.token_login.token !== token) {
        throw invalid;
      }

      if (user.token_login.expiration_date <= new Date().getTime()) {
        throw expired;
      }

      return user._id;
    })
    .catch(err => {
      if (err.status === 404) {
        throw invalid;
      }
      throw err;
    });
};


/**
 * Generates a new random password for the user. Returns this password to be used to generate a session for this user.
 * @param userId
 * @returns {Promise<Object>} - object containing the user's name and the new password
 */
const resetPassword = userId => {
  return db.users.get(userId).then(user => {
    if (!user.token_login || !user.token_login.active) {
      return Promise.reject({ code: 400, message: 'invalid user' });
    }

    user.password = passwords.generate();
    return db.users
      .put(user)
      .then(() => ({ user: user.name, password: user.password }));
  });
};


/**
 * Updates the user and userSettings docs when the token login link is accessed successfully.
 * @param {String} userId - the user's id to login via token link
 * @returns {Promise}
 */
const deactivateTokenLogin = userId => {
  return Promise
    .all([
      db.users.get(userId),
      db.medic.get(userId),
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

      return Promise.all([
        db.medic.put(userSettings),
        db.users.put(user),
      ]);
    });
};

module.exports = {
  shouldEnableTokenLogin,
  validateTokenLogin,
  manageTokenLogin,
  isTokenLoginEnabled,
  getUserByToken,
  resetPassword,
  deactivateTokenLogin,
};
