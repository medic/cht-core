const config = require('./libs/config');
const passwords = require('./libs/passwords');

const hasBothOidcAndTokenOrPasswordLogin = data => data.oidc_provider && (!!data.password || data.token_login === true);

const isSsoLoginEnabled = settings => !!settings?.oidc_provider?.client_id;

const isOidcClientIdValid = (settings, clientId) => clientId === settings?.oidc_provider?.client_id;

const validateSsoLogin = async(data) => {

  if (!data.oidc_provider){
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
  if (!isOidcClientIdValid(settings, data.oidc_provider)){
    return {
      msg: 'Invalid OIDC Client Id'
    }; 
  }

  data.password = passwords.generate();
  data.password_change_required = false;
  
};


module.exports = {
  validateSsoLogin
};
