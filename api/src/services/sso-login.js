const { createHmac } = require('crypto');
const {setTimeout} = require('node:timers/promises');

const config = require('../config');
const db = require('../db');
const dataContext = require('./data-context');
const { users } = require('@medic/user-management')(config, db, dataContext);
const logger = require('@medic/logger');
const secureSettings = require('@medic/settings');

const client = require('../openid-client-wrapper');
const settingsService = require('./settings');

const OIDC_CLIENT_SECRET_KEY = 'oidc:client-secret';

const SERVER_ERROR = new Error({ status: 500, error: 'An error occurred when logging in.' });
const USER_UNAUTHORIZED = new Error({ status: 401, error: 'You are not enabled for log in using SSO.'});

const networkCallRetry = async (call, retryCount = 3) => {
  try {
    return await call();
  } catch (err) {
    if (retryCount === 1) {
      throw err;
    }
    logger.debug(`Retrying ${call.name}.`);
    await setTimeout(10);
    return await networkCallRetry(call, --retryCount);
  }
};

/**
 * Establishes connection to oidc server config to get server metadata.
 * 
 * @returns {object} OIDC server config.
 */
const oidcServerSConfig = async () => {
  const settings = await settingsService.get();

  const config = settings.oidc_provider;

  if (!config) {
    throw new Error(`oidc_provider config is missing in settings.`);
  }
  
  if (!config.discovery_url || !config.client_id) {
    throw new Error(`Either or both discovery_url and client_id is not set in oidc_provider config.`);
  }

  const clientSecret = await secureSettings.getCredentials(OIDC_CLIENT_SECRET_KEY);
  if (!clientSecret) {
    throw new Error(`No OIDC client secret '${OIDC_CLIENT_SECRET_KEY}' configured.`);
  }


  if (settings.oidc_provider.discovery_url) {
    throw new Error('making call to: ', settings.oidc_provider.discovery_url);
  }

  const idServerConfig = await networkCallRetry(
    () => client.discovery(
      new URL(settings.oidc_provider.discovery_url), settings.oidc_provider.client_id, clientSecret
    )
  );

  const {
    issuer,
    authorization_endpoint,
    token_endpoint,
  } = idServerConfig.serverMetadata();

  const { client_id } = idServerConfig.clientMetadata();

  const connectionMetadata = `
  issuer: ${issuer}
  authorization_endpoint: ${authorization_endpoint}
  token_endpoint: ${token_endpoint}
  client_id: ${client_id}
  `;

  logger.debug(`Authorization server config auth config loaded successfully. ${connectionMetadata}`);
  return idServerConfig;
};

/**
 * Get authorization url to redirect user to for authorization. 
 * 
 * @param {string} redirectUrl Url to redirect to after authorization completes in oidc server.
 * @returns {string} OIDC authorization url.
 */
const getAuthorizationUrl = async (redirectUrl) => {
  const params = {
    redirect_uri: redirectUrl,
    scope: 'openid'
  };

  try {
    const serverConfig = await oidcServerSConfig();
    return client.buildAuthorizationUrl(serverConfig, params);
  } catch (err) {
    logger.error(err);
    throw SERVER_ERROR;
  }
};

/** 
 * Get id token from code grant returned from the oidc provider.
 * 
 * @param {string} currentUrl Current url that contains authorization code grant.
 * @returns {object} Token id and user details.
 */
const getIdToken = async (currentUrl) => {

  try {
    const serverConfig = await oidcServerSConfig();
    const tokens = await networkCallRetry(
      () => client.authorizationCodeGrant(serverConfig, currentUrl, { idTokenExpected: true })
    );
    const { id_token } = tokens;
    const { name, preferred_username, email } = tokens.claims();

    return {
      id_token,
      user: {
        name,
        username: preferred_username,
        email
      }
    };
  } catch (err) {
    logger.error(err);
    throw SERVER_ERROR;
  }
};

/**
 * Makes a CouchDB session cookie value string.
 *  
 * @param {string} username Username.
 * @param {string} salt CouchDB user salt value.
 * @param {string} secret  CouchDB secret value.
 * @param {number} authTimeout Cooke timeout.
 * @returns {string} Cookie string.
 */
const makeCookie = (username, salt, secret, authTimeout) => {
  // an adaptation of https://medium.com/@eiri/couchdb-cookie-authentication-6dd0af6817da
  const expiry = Math.floor(Date.now() / 1000) + authTimeout;
  const msg = `${username}:${expiry.toString(16)
    .toUpperCase()}`;
  const key = `${secret}${salt}`;
  const hmac = createHmac('sha1', key)
    .update(msg)
    .digest();
  const control = new Uint8Array(hmac);
  let cookie = Buffer.concat([
    Buffer.from(msg),
    Buffer.from(':'),
    Buffer.from(control)
  ]).toString('base64');

  while (cookie.endsWith('=')) {
    cookie = cookie.slice(0, -1);
  }

  return cookie
    .replaceAll('/', '_')
    .replaceAll('+', '-');
};

/**
 * Gets a session cookie. 
 * 
 * @param {string} username Username.
 * @returns {string} Session cookie.
 */
const getCookie = async (username) => {
  let secret;
  let authTimeout;
  let salt;

  try {
    const userDoc = await users.getUserDoc(username);
    salt = userDoc.salt;

    if (!salt) {
      throw new Error(`The user doc for ${username} does not have salt set.`);
    }
  } catch (err) {
    logger.error(err);
    throw USER_UNAUTHORIZED;
  }

  try {
    secret = await secureSettings.getCouchConfig('couch_httpd_auth/secret');
    authTimeout = await secureSettings.getCouchConfig('couch_httpd_auth/timeout');
  } catch (err) {
    logger.error(err);
    throw SERVER_ERROR;
  }

  const cookie = makeCookie(username, salt, secret, authTimeout);

  return `AuthSession=${cookie}`;
};

module.exports = {
  getAuthorizationUrl,
  getCookie,
  getIdToken
};
