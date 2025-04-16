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

module.exports = {
  validateSsoLogin,
  validateSsoLoginUpdate
};
