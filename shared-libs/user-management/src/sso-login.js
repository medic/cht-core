const db = require('./libs/db');
const passwords = require('./libs/passwords');

const SETTINGS_DOC_ID = 'settings';

const getSettingsDoc = async() => await db.medic.get(SETTINGS_DOC_ID);

const hasBothOidcAndTokenOrPasswordLogin = data => data.oidc_provider && (data.password || data.token_login === true);

const isSsoLoginEnabled = (settings) =>  settings && settings.oidc_provider && settings.oidc_provider.client_id;

const isOidcClientIdValid = (settings, clientId) => settings.oidc_provider
 && clientId === settings.oidc_provider.client_id;

const validateSsoLogin = async(data) => {
  if (hasBothOidcAndTokenOrPasswordLogin(data)){
    return {
      msg: 'Either OIDC Login only or Token/Password Login is allowed.',
      key: 'configuration.oidc.client.required' //TODO: Ask about these keys
    }; 
  }
    
  const settings = await getSettingsDoc();

  if (!settings){
    return {
      msg: 'Settings Doc Not Found.',
      key: 'configuration.oidc.client.required' //TODO: Ask about these keys
    }; 
  }
  if (!isSsoLoginEnabled(settings)){
    return {
      msg: 'OIDC Login is not enabled.',
      key: 'configuration.oidc.client.required' //TODO: Ask about these keys
    }; 

  }
  if (isSsoLoginEnabled(settings) && !isOidcClientIdValid(settings, data.oidc_provider)){
    return {
      msg: 'Invalid OIDC Client id.',
      key: 'configuration.oidc.client.required' //TODO: Ask about these keys
    }; 
  }
  data.password = passwords.generate();
};


module.exports = {
  validateSsoLogin
};
