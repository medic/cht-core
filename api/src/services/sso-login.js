const { createHmac } = require('crypto');
const {setTimeout} = require('node:timers/promises');
const config = require('../config');
const db = require('../db');
const dataContext = require('./data-context');
const { ssoLogin } = require('@medic/user-management')(config, db, dataContext);
const logger = require('@medic/logger');
const secureSettings = require('@medic/settings');
const client = require('./openid-client');
const settingsService = require('./settings');
const translations = require('../translations');

const OIDC_CLIENT_SECRET_KEY = 'oidc:client-secret';

/**
 * Retries the function call for the unknown errors.
 *
 * @param {function} call
 * @param {int} retryCount
 * @returns Function call result.
 */
const authServerCallRetry = async (call, retryCount = 3) => {
  try {
    return await call();
  } catch (err) {
    if (retryCount === 1 || !Number.isNaN(err.status) && err.status < 500) {
      throw err;
    }

    logger.debug(`Retrying OIDC request: ${call.name}.`);
    await setTimeout(10);
    return await authServerCallRetry(call, --retryCount);
  }
};

/**
 * Establishes connection to oidc server to get server metadata.
 * 
 * @returns {object} OIDC server config.
 */
const oidcServerSConfig = async () => {
  const settings = await settingsService.get();
  if (!settings.oidc_provider) {
    throw new Error('oidc_provider config is missing in settings.');
  }

  const { allow_insecure_requests, client_id, discovery_url } = settings.oidc_provider;
  
  if (!discovery_url || !client_id) {
    throw new Error('The discovery_url and client_id must be provided in the oidc_provider config.');
  }

  const clientSecret = await secureSettings.getCredentials(OIDC_CLIENT_SECRET_KEY);
  if (!clientSecret) {
    throw new Error(`No OIDC client secret '${OIDC_CLIENT_SECRET_KEY}' configured.`);
  }

  const execute = allow_insecure_requests ? [client.allowInsecureRequests] : [];
  const discoveryUrl = new URL(discovery_url);
  const discovery = () => client.discovery(discoveryUrl, client_id, clientSecret, null, { execute });
  const idServerConfig = await authServerCallRetry(discovery);

  const {
    issuer,
    authorization_endpoint,
    token_endpoint,
    grant_types_supported,
    response_types_supported,
    claims_supported,
    scopes_supported,
  } = idServerConfig.serverMetadata();
  logger.debug(`Authorization server config loaded: ${JSON.stringify({
    issuer,
    authorization_endpoint,
    token_endpoint,
    grant_types_supported,
    response_types_supported,
    claims_supported,
    scopes_supported,
  })}`);
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
    scope: 'openid email'
  };

  const serverConfig = await oidcServerSConfig();
  return client.buildAuthorizationUrl(serverConfig, params);
};

const getLocale = async (localeClaim) => {
  const currentLocaleCds = await translations
    .getEnabledLocales()
    .then(docs => docs.map(({ code }) => code));
  if (localeClaim && currentLocaleCds.includes(localeClaim)) {
    return localeClaim;
  }
  logger.debug(`Invalid local for user [${localeClaim}]. Using default locale.`);
  return currentLocaleCds[0];
};

/**
 * Get id token from code grant returned from the oidc provider.
 *
 * @param {string} currentUrl Current url that contains authorization code grant.
 * @returns {object} Token id and user details.
 */
const getIdToken = async (currentUrl) => {
  const serverConfig = await oidcServerSConfig();
  const authorizationCodeGrant = () => client.authorizationCodeGrant(
    serverConfig,
    currentUrl,
    { idTokenExpected: true }
  );
  const tokens = await authServerCallRetry(authorizationCodeGrant);
  const { email, locale } = tokens.claims();
  if (!email) {
    throw new Error('Email claim is missing in the id token.');
  }

  return {
    username: email,
    locale: await getLocale(locale),
  };
};

/**
 * Makes a CouchDB session cookie value string.
 *  
 * @param {string} username Username.
 * @param {string} salt CouchDB user salt value.
 * @param {string} secret  CouchDB secret value.
 * @returns {string} Cookie string.
 */
const makeCookie = (username, salt, secret) => {
  // an adaptation of https://medium.com/@eiri/couchdb-cookie-authentication-6dd0af6817da
  const currentEpochDate = Math.floor(Date.now() / 1000);
  const msg = `${username}:${currentEpochDate.toString(16).toUpperCase()}`;
  const key = `${secret}${salt}`;
  const hmac = createHmac('sha1', key)
    .update(msg)
    .digest();
  const control = new Uint8Array(hmac);
  const cookie = Buffer.concat([
    Buffer.from(msg),
    Buffer.from(':'),
    Buffer.from(control)
  ]).toString('base64');

  // Make sure format matches Couch's encoding
  return cookie
    .replace(/=+$/, '')
    .replaceAll('/', '_')
    .replaceAll('+', '-');
};

const unauthorizedError = (message) => {
  const error = new Error(message);
  error.status = 401;
  return error;
};

/**
 * Gets a session cookie. 
 * 
 * @param {string} oidcUsername Username.
 * @returns {string} Session cookie.
 */
const getCookie = async (oidcUsername) => {
  const [userDoc, ...duplicates] = await ssoLogin.getUsersByOidcUsername(oidcUsername);
  if (!userDoc) {
    throw unauthorizedError(`CHT user not found for oidc_username [${oidcUsername}].`);
  }
  if (duplicates.length) {
    throw new Error(`Multiple CHT users found for oidc_username [${oidcUsername}].`);
  }
  if (!userDoc.salt) {
    throw unauthorizedError(`The user doc for ${userDoc.name} does not have a password salt.`);
  }

  const secret = await secureSettings.getCouchConfig('couch_httpd_auth/secret');
  const cookie = makeCookie(userDoc.name, userDoc.salt, secret);
  return `AuthSession=${cookie}`;
};

module.exports = {
  getAuthorizationUrl,
  getCookie,
  getIdToken
};
