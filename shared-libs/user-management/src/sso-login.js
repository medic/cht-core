const config = require('./libs/config');
const passwords = require('./libs/passwords');

const isSsoLoginEnabled = () => !!config.get('oidc_provider');

const validateSsoLogin = (data) => {
  if (!data.oidc_username){
    return;
  }
  if (data.password || data.token_login){
    return { msg: 'Cannot set password or token_login with oidc_username.' };
  }
  if (!isSsoLoginEnabled()){
    return { msg: 'Cannot set oidc_username when OIDC Login is not enabled.' };
  }

  data.password = passwords.generate();
  data.password_change_required = false;
};

const validateSsoLoginUpdate = (data, updatedUser) => {
  if (!data.oidc_username && !data.password && !data.token_login) {
    return;
  }
  // token_login is set on updateUser later, so check data here
  if (updatedUser.oidc_username && data.token_login) {
    return { msg: 'Cannot set token_login with oidc_username.' };
  }

  return validateSsoLogin(updatedUser);
};

module.exports = {
  isSsoLoginEnabled,
  validateSsoLogin,
  validateSsoLoginUpdate
};
