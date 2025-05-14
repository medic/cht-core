const config = require('./libs/config');
const passwords = require('./libs/passwords');
const db = require('./libs/db');

const isSsoLoginGloballyEnabled = () => {
  return isSsoLoginEnabled();
};

const shouldEnableSsoLogin = (data) => {
  return isSsoLoginGloballyEnabled() && data.oidc === true;
};

const validateSsoLoginEdit = async (data, updatedUser) => {
  const user = await db.users.get(updatedUser._id);
  const wasUsingSSO = user.oidc;

  if (wasUsingSSO && 'oidc' in data && data.oidc === undefined) {
    return {
      msg: 'Explicitly disable sso login.',
      key: 'sso.user.disable.undefined',
    };
  }

  const disablingSSO = data.oidc === false;

  const passwordOrTokenLogin = data.password || data.token_login;

  if (disablingSSO && wasUsingSSO && !passwordOrTokenLogin) {
    return {
      msg: 'Password is required when disabling sso login.',
      key: 'sso.user.disable.password',
    };
  }

  if (shouldEnableSsoLogin(data)) {
    updatedUser.password = passwords.generate();
    updatedUser.password_change_required = false;
  }
};

const validateSsoLogin = (data, newUser = true, user = {}) => {
  return newUser
    ? validateSsoLoginCreate(data)
    : validateSsoLoginEdit(data, user);
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

      response.oidc = true;

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
  const settings = config.get();
  return !!settings?.oidc_provider?.client_id;
};

const validateSsoLoginCreate = (data) => {
  if (!data.oidc){
    return;
  }
  
  if (hasBothOidcAndTokenOrPasswordLogin(data)){
    return {
      msg: 'Either OIDC Login only or Token/Password Login is allowed'
    }; 
  }

  if (!isSsoLoginEnabled()){
    return {
      msg: 'OIDC Login is not enabled'
    }; 

  }

  data.password = passwords.generate();
  data.password_change_required = false;
};

const validateSsoLoginUpdate = (data, updatedUser) => {
  if (!data.oidc && !data.password && !data.token_login) {
    return;
  }
  // token_login is set on updateUser later, so check data here
  if (updatedUser.oidc && (data.token_login || data.password)) {
    return { msg: 'Either OIDC Login only or Token/Password Login is allowed' };
  }

  return validateSsoLoginEdit(data, updatedUser);
};


module.exports = {
  shouldEnableSsoLogin,
  validateSsoLogin,
  manageSsoLogin,
  validateSsoLoginUpdate
};
