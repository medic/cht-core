const config = require('./libs/config');
const db = require('./libs/db');
const passwords = require('./libs/passwords');

const shouldEnableSsoLogin = (data) => {
  return isSsoLoginEnabled() && data.oidc === true;
};

/**
 * Validates that updates to SSO user are valid:-
 * - validates that oidc_username is set for a new user
 * - ignore validations if none of oidc_username, password or token_login properties are being updated
 * - validate that oidc_username, password or token_login are not set at the same time
 * - validate that oidc_username can only be set if oidc login is enabled in settings
 * - validate that if disabling oidc login requires password if not disabling to token_login
 * - reset password if enabling oidc or disabling oidc to token_login
 * @param {object} data Update object.
 * @param {boolean} newUser If context is new user or not.
 * @param {object} user User object that is being updated, but already updated with update objecct (data) values.
 * @returns validation error if validation fails, else returns undefined.
 */
const validateSsoLogin = async (data, newUser = true, user = {}) => {
  const editUser = !newUser;

  if (newUser && !data.oidc_username){
    return;
  }

  if (editUser && !data.oidc_username && !data.password && !data.token_login) {
    return;
  }

  const passwordOrTokenLogin = data.password || data.token_login;

  if (!data.oidc_username) {
    const disablingSSO = !!user.oidc_username;
    if (!disablingSSO) {
      return;
    }

    if (!passwordOrTokenLogin) {
      return { msg: 'Password is required when disabling sso login.' };
    }

    if (data.token_login && data.password){
      return { msg: 'Cannot set password when setting token_login.' };
    }

    if (data.token_login) {
      data.password = passwords.generate();
      data.password_change_required = false;
    }

    return;
  }

  if (passwordOrTokenLogin){
    return { msg: 'Cannot set password or token_login with oidc_username.' };
  }

  if (!isSsoLoginEnabled()){
    return { msg: 'Cannot set oidc_username when OIDC Login is not enabled.' };
  }

  const duplicateUserId = await getUserIdWithDuplicateOidcUsername(data.oidc_username, data._id);
  if (duplicateUserId) {
    return { msg: `The oidc_username [${data.oidc_username}] already exists for user [${duplicateUserId}].` };
  }

  if (newUser) {
    data.password = passwords.generate();
    data.password_change_required = false;
  }
};

const getUsersByOidcUsername = async (oidcUsername) => db.users
  .query('users/users_by_field', { include_docs: true, key: ['oidc_username', oidcUsername] })
  .then(({ rows }) => rows.map(({ doc }) => doc));

const getUserIdWithDuplicateOidcUsername = async (oidcUsername, userDocId) => {
  const duplicates = await getUsersByOidcUsername(oidcUsername);
  return duplicates
    .map(({ _id }) => _id)
    .filter(id => id !== userDocId)[0];
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

const isSsoLoginEnabled = () => !!config.get('oidc_provider');

module.exports = {
  shouldEnableSsoLogin,
  isSsoLoginEnabled,
  getUsersByOidcUsername,
  validateSsoLogin,
  manageSsoLogin
};
