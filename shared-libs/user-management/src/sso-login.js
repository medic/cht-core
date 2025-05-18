const config = require('./libs/config');
const passwords = require('./libs/passwords');
const db = require('./libs/db');

const shouldEnableSsoLogin = (data) => {
  return isSsoLoginEnabled() && data.oidc === true;
};


/**
 * Validates that updates to SSO user are valid:-
 * - validate that oidc property is set for a new user
 * - if none of oidc, password or token_login properties are being updated, ignore validations
 * - validate that oidc, password or token_login are not set at the same time
 * - validate that oidc can only be activated if oidc login is enabled in settings
 * - validate that if disabling oidc, and not to token_login, password is required
 * - reset password if enabling oidc or disabling oidc to token_login
 * @param {object} data Update object.
 * @param {boolean} newUser If context is new user or not.
 * @param {object} user User object that is being updated, but already updated with update objecct (data) values.
 * @returns validation error if validation fails, else returns undefined.
 */
const validateSsoLogin = (data, newUser = true, user = {}) => {
  const editUser = !newUser;

  if (newUser && !data.oidc) {
    return;
  }

  if (!editUser && !data.oidc && !data.password && !data.token_login) {
    return;
  }

  if (hasBothOidcAndTokenOrPasswordLogin(data)){
    return {
      msg: 'Either OIDC Login only or Token/Password Login is allowed'
    };
  }

  if (data.oidc && !isSsoLoginEnabled()) {
    return { msg: 'OIDC Login is not enabled' };
  }

  const disablingSSO = user.oidc && !data.oidc;
  const passwordOrTokenLogin = data.password || data.token_login;
  if (!editUser && disablingSSO && !passwordOrTokenLogin) {
    return { msg: 'Password is required when disabling sso login.' };
  }

  if (newUser || (editUser && data.token_login)) {
    data.password = passwords.generate();
    data.password_change_required = false;
  }
};

const enableSsoLogin = (response) => {
  return Promise
    .all([
      db.users.get(response.user.id),
      db.medic.get(response['user-settings'].id),
    ])
    .then(([ user, userSettings ]) => {
      user.oidc = true;

      userSettings.oidc = true;

      return Promise.all([ db.users.put(user), db.medic.put(userSettings) ]);
    })
    .then(() => response);
};

/**
 * Disables token-login for a user.
 * Deletes the `oidc` properties from the user and userSettings doc.
 * Clears pending tasks in existent SMSs
 *
 * @param {Object} response - the response of previous actions
 * @returns {Promise<{Object}>} - updated response to be sent to the client
 */
const disableSsoLogin = (response) => {
  return Promise
    .all([
      db.users.get(response.user.id),
      db.medic.get(response['user-settings'].id),
    ])
    .then(([ user, userSettings ]) => {
      delete user.oidc;
      delete userSettings.oidc;

      return Promise.all([
        db.medic.put(userSettings),
        db.users.put(user),
      ]);
    })
    .then(() => response);
};

/**
 * Enables or disables sso-login for a user
 * @param {Object} data - the request body
 * @param {String} appUrl - the base URL of the application
 * @param {Object} response - the response of previous actions
 * @returns {Promise<{Object}>} - updated response to be sent to the client
 */
const manageSsoLogin = (data, response) => {
  if (data.oidc === false) {
    return disableSsoLogin(response);
  }

  if (!shouldEnableSsoLogin(data)) {
    return Promise.resolve(response);
  }

  if (data.oidc === true) {
    return enableSsoLogin(response);
  }
};

const hasBothOidcAndTokenOrPasswordLogin = data => data.oidc && (data.password || data.token_login);

const isSsoLoginEnabled = () => {
  const settings = config.get('oidc_provider');
  return !!settings;
};

module.exports = {
  shouldEnableSsoLogin,
  validateSsoLogin,
  manageSsoLogin
};
