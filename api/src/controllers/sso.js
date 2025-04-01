const client = require('openid-client');

const config = require('../config');
const db = require('../db');
const dataContext = require('../services/data-context');
const { users } = require('@medic/user-management')(config, db, dataContext);
const logger = require('@medic/logger');
const secureSettings = require('@medic/settings');

const { validateSession, setCookies, sendLoginErrorResponse } = require('./login');
const settingsService = require('../services/settings');
const { error } = require('console');


const SSO_PATH = "oidc";
const SSO_AUTHORIZE_PATH = `${SSO_PATH}/authorize`;
const SSO_AUTHORIZE_GET_TOKEN_PATH = `${SSO_PATH}/get_token`;

const OIDC_CLIENT_SECRET_KEY = "oidc:client-secret";

let ASConfig;
let code_verifier;
let state;
let pathPrefix;

const getOidcClientSecret = async (key) => {
  const secret = await secureSettings.getCredentials(key);

  if(!secret)
  {
    const err = `No OIDC client secret '${key}' configured.`
    logger.error(err);
    throw err;
  }

  return secret;
};

const init = async (routePrefix) => {
  pathPrefix = routePrefix;

  const settings = await settingsService.get()

  if(!settings.oidc_provider) {
    logger.info("Authorization server config settings not provided.");
    return;
  }


  const {
    discovery_url,
    client_id
  } = settings.oidc_provider;

  try {
    const clientSecret = await getOidcClientSecret(OIDC_CLIENT_SECRET_KEY);

    ASConfig = await client.discovery(
      new URL(discovery_url),
      client_id,
      clientSecret
    );
  } catch (e) {
    throw { status: 400, error: e};
  } 

  logger.info('Authorization server config auth config loaded successfully.');

  return ASConfig;
}

const getSsoBaseUrl = (req) => {
  return new URL(`${req.protocol}://${req.get('host')}${pathPrefix}`);
}

const getAuthorizationUrl = async (req) => {

  code_verifier = client.randomPKCECodeVerifier();

  const code_challenge_method = 'S256';
  const code_challenge = await client.calculatePKCECodeChallenge(code_verifier);

  const redirectUrl = `${getSsoBaseUrl(req).href}${SSO_AUTHORIZE_GET_TOKEN_PATH}`;

  let parameters = {
    redirect_uri: redirectUrl,
    scope: 'openid'
  }
 
  if (ASConfig.serverMetadata().supportsPKCE()) {
    parameters = { ...parameters, ...{ code_challenge_method, code_challenge } }
  }

  return client.buildAuthorizationUrl(ASConfig, parameters);
}

const getIdToken = async (req) => {
  let params = {};

  if (ASConfig.serverMetadata().supportsPKCE()) {
    params = {
      idTokenExpected: true,
      pkceCodeVerifier: code_verifier,
      state: state
    }
  }

  const currentUrl =  new URL(`${req.protocol}://${req.get('host')}${req.originalUrl}`);

  let tokens = await client.authorizationCodeGrant(ASConfig, currentUrl, params);

  const { id_token } = tokens;

  const { name, preferred_username, email } = tokens.claims();

  const user = {
    name,
    username: preferred_username,
    email
  }

  const auth = {
    id_token,
    user
  }

  return auth;
}

const getUserPassword = async username => {
  const user = await users.getUser(username);

  if (!user || !user.id) {
    throw { status: 401, error: `Invalid. Could not login ${username} using SSO.`};
  }

  const password = await users.resetPassword(username);
  return { user: user.username, password };
};

const login = async (req, res) => {
  try {
    const auth = await getIdToken(req, res);

    const {user, password} = await getUserPassword(auth.user.username)

    req.body = { user, password };
    const sessionRes = await validateSession(req);
    const redirectUrl = await setCookies(req, res, sessionRes);

    res.redirect(redirectUrl);
  } catch (e) {
    return sendLoginErrorResponse(e, res);
  }
};

const redirectToSSOAuthorize =  (req, res) => {
  res.redirect(301, `${getSsoBaseUrl(req).href}${SSO_AUTHORIZE_PATH}`);
}

const authorize = async (req, res) => {
  const redirectUrl = await getAuthorizationUrl(req);

  res.redirect(301, redirectUrl.href);
}

module.exports = {
  init,
  redirectToSSOAuthorize,
  authorize,
  login,
  SSO_AUTHORIZE_GET_TOKEN_PATH,
  SSO_AUTHORIZE_PATH,
  SSO_PATH,
}
 