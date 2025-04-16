const config = require('./libs/config');
const passwords = require('./libs/passwords');

const hasBothOidcAndTokenOrPasswordLogin = data => data.oidc && (data.password || data.token_login);

const isSsoLoginEnabled = settings => !!settings?.oidc_provider?.client_id;

const validateSsoLogin = (data) => {
  if (!data.oidc){
    return;
  }
  
  if (hasBothOidcAndTokenOrPasswordLogin(data)){
    return {
      msg: 'Either OIDC Login only or Token/Password Login is allowed'
    }; 
  }

  const settings = config.get();

  if (!isSsoLoginEnabled(settings)){
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
  if (updatedUser.oidc && data.token_login) {
    return { msg: 'Either OIDC Login only or Token/Password Login is allowed' };
  }

  return validateSsoLogin(updatedUser);
};

const isSSOLoginGloballyEnabled = () => {
  const ssoLoginConfig = config.get('sso_login');
  return Boolean(ssoLoginConfig?.enabled);
};

const shouldEnableSSOLogin = (data) => {
  return isSSOLoginGloballyEnabled() && data.sso_login_enabled === true;
};

const validateSSOLoginCreate = (data) => {
  if (shouldEnableSSOLogin(data)) {
    data.password = passwords.generate();
    data.password_change_required = false;
  }
};

const validateSSOLoginEdit = (data, user) => {
  const disablingSSO = data.sso_login_enabled === false;
  const wasUsingSSO = user.sso_login_enabled;

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
      user.sso_login_enabled = true;

      userSettings.sso_login_enabled = true;

      response.sso_login_enabled = true;

      return Promise.all([ db.users.put(user), db.medic.put(userSettings) ]);
    })
    .then(() => response);
};

/**
 * Disables token-login for a user.
 * Deletes the `sso_login_enabled` properties from the user and userSettings doc.
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
      if (!user.sso_login_enabled) {
        return;
      }

      delete user.sso_login_enabled;
      delete userSettings.sso_login_enabled;

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
  if (data.sso_login_enabled === false) {
    return disableSSOLogin(response);
  }

  if (!shouldEnableSSOLogin(data)) {
    return Promise.resolve(response);
  }

  return enableSSOLogin(appUrl, response);
};

module.exports = {
  validateSsoLogin,
  validateSsoLoginUpdate,
  shouldEnableSSOLogin,
  manageSSOLogin
};
