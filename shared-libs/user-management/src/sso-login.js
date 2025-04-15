const config = require('./libs/config');
const passwords = require('./libs/passwords');
const db = require('./libs/db');
const tokenLogin = require('./token-login');

const isSSOLoginGloballyEnabled = () => {
  return isSsoLoginEnabled()
};

const shouldEnableSSOLogin = (data) => {
  return isSSOLoginGloballyEnabled() && data.oidc === true;
};

const validateSSOLoginEdit = (data, user) => {
  const disablingSSO = data.oidc === false;
  const wasUsingSSO = user.oidc;

  if (disablingSSO && wasUsingSSO && !data.password) {
    return {
      msg: 'Password is required when disabling sso login.',
      key: 'password.length.minimum',
    };
  }

  if (shouldEnableSSOLogin(data)) {
    user.password = passwords.generate();
    user.password_change_required = false;

    // disable token login fo user here if it was enabled
    if (user.token_login) {
      tokenLogin.disableTokenLogin(user);
    }
  }
};

const validateSSOLogin = (data, newUser = true, user = {}) => {
  return newUser
    ? validateSSOLoginCreate(data)
    : validateSSOLoginEdit(data, user);
};

const enableSSOLogin = (appUrl, response) => {
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
const disableSSOLogin = (response) => {
  return Promise
    .all([
      db.users.get(response.user.id),
      db.medic.get(response['user-settings'].id),
    ])
    .then(([ user, userSettings ]) => {
      if (!user.oidc) {
        return;
      }

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
const manageSSOLogin = (data, appUrl, response) => {
  if (data.oidc === false) {
    return disableSSOLogin(response);
  }

  if (!shouldEnableSSOLogin(data)) {
    return Promise.resolve(response);
  }

  return enableSSOLogin(appUrl, response);
};

const hasBothOidcAndTokenOrPasswordLogin = data => data.oidc && (data.password || data.token_login);

const isSsoLoginEnabled = () => {
  const settings = config.get();
  return !!settings?.oidc_provider?.client_id;
}

const validateSSOLoginCreate = (data) => {
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
  // token_login is set on updateUser later, so check data here
  if (updatedUser.oidc && data.token_login) {
    return { msg: 'Either OIDC Login only or Token/Password Login is allowed' };
  }

  return validateSSOLoginEdit(data, updatedUser);
};


module.exports = {
  shouldEnableSSOLogin,
  validateSSOLogin,
  manageSSOLogin,
  validateSsoLoginUpdate
};
