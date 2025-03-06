const db = require('./libs/db');
const passwords = require('./libs/passwords');

const SETTINGS_DOC_ID = 'settings';

const getSettingsDoc = async() => await db.medic.get(SETTINGS_DOC_ID);

const hasBothOidcAndTokenOrPasswordLogin = data => data.oidc_provider && (!!data.password || data.token_login === true);

const isSsoLoginEnabled = settings =>  !!settings && !!settings.oidc_provider && !!settings.oidc_provider.client_id;

const isOidcClientIdValid = (settings, clientId) => isSsoLoginEnabled(settings) && 
  clientId === settings.oidc_provider.client_id;

const validateSsoLogin = async(data, newUser = true) => {

  if (!data.oidc_provider){
    return;
  }
  
  if (hasBothOidcAndTokenOrPasswordLogin(data)){
    return {
      msg: 'Either OIDC Login only or Token/Password Login is allowed'
    }; 
  }
    
  let settings = await getSettingsDoc();
  settings = settings.settings;

  if (!settings){
    return {
      msg: 'Settings Doc Not Found'
    }; 
  }
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

  if (newUser){
    data.password = passwords.generate();
  }
  
};


module.exports = {
  validateSsoLogin,
  hasBothOidcAndTokenOrPasswordLogin,
  isSsoLoginEnabled,
  isOidcClientIdValid,
  getSettingsDoc
};
