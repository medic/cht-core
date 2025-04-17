const { createHmac } = require('crypto');

const config = require('../config');
const db = require('../db');
const dataContext = require('../services/data-context');
const { users } = require('@medic/user-management')(config, db, dataContext);
const logger = require('@medic/logger');
const secureSettings = require('@medic/settings');
const environment = require('@medic/environment');
const request = require('@medic/couch-request');

const client = require('../openid-client-wrapper');
const { setCookies, sendLoginErrorResponse } = require('./login');
const settingsService = require('../services/settings');
const { setTimeout } = require('later');

const OIDC_CLIENT_SECRET_KEY = 'oidc:client-secret';

const SERVER_ERROR = new Error({ status: 500, error: 'An error occurred when logging in.' });

let ASConfig;
let code_verifier;

const networkCallRetry = async (call, retryCount = 3) => {
  try {
    return await call();
  } catch (err) {
    if (retryCount === 1) {
      throw err;
    }
    logger.debug(`Retrying ${call.name}.`);
    return await setTimeout(networkCallRetry(call, --retryCount), 10);
  }
};

const init = async () => {
  const settings = await settingsService.get();
  if (!settings.oidc_provider) {
    logger.info('Authorization server config settings not provided.');
    return;
  }

  const clientSecret = await secureSettings.getCredentials(OIDC_CLIENT_SECRET_KEY);
  if (!clientSecret) {
    const err = `No OIDC client secret '${OIDC_CLIENT_SECRET_KEY}' configured.`;
    logger.error(err);
    throw new Error(err);
  }

  try {
    ASConfig = await networkCallRetry(
      () => client.discovery(
        new URL(settings.oidc_provider.discovery_url), settings.oidc_provider.client_id, clientSecret
      ),
      3
    );
  } catch (e) {
    logger.error(e);
    const err = 'The SSO provider is unreachable.';
    throw new Error({ status: 503, error: err });
  }

  logger.info('Authorization server config auth config loaded successfully.');

  return ASConfig;
};

const getAuthorizationUrl = async (serverConfig, redirectUrl) => {
  code_verifier = client.randomPKCECodeVerifier();

  const code_challenge_method = 'S256';
  const code_challenge = await client.calculatePKCECodeChallenge(code_verifier);

  let parameters = {
    redirect_uri: redirectUrl,
    scope: 'openid'
  };

  if (serverConfig?.serverMetadata()?.supportsPKCE()) {
    parameters = { ...parameters, ...{ code_challenge_method, code_challenge } };
  }

  return client.buildAuthorizationUrl(serverConfig, parameters);
};

const getIdToken = async (serverConfig, currentUrl) => {
  let params = {};

  if (serverConfig?.serverMetadata()?.supportsPKCE()) {
    params = {
      idTokenExpected: true,
      pkceCodeVerifier: code_verifier
    };
  }

  try {
    const tokens = await networkCallRetry(() => client.authorizationCodeGrant(ASConfig, currentUrl, params), 3);
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

const getCookie = async (username) => {
  let secret;
  let authTimeout;
  let salt;

  try {
    const userDoc = await users.getUserDoc(username);
    salt = userDoc.salt;
  } catch (err) {
    logger.error(err);
    throw new Error({ status: 401, error: 'You are not enabled for log in using SSO.'});
  }

  try {
    secret = await request.get({
      url: new URL('_node/_local/_config/couch_httpd_auth/secret', environment.serverUrl).toString(),
      json: true
    });

    authTimeout = await request.get({
      url: new URL('_node/_local/_config/couch_httpd_auth/timeout', environment.serverUrl).toString(),
      json: true
    });
  } catch (err) {
    logger.error(err);
    throw SERVER_ERROR;
  }

  const cookie = makeCookie(username, salt, secret, authTimeout);

  return `AuthSession=${cookie}`;
};

const login = async (req, res) => {
  req.body = { locale: 'en' };
  const currentUrl =  new URL(`${req.protocol}://${req.get('host')}${req.originalUrl}`);
  try {
    const auth = await getIdToken(ASConfig, currentUrl);
    const cookie = await getCookie(auth.user.username);
    const redirectUrl = await setCookies(req, res, null, cookie);
    res.redirect(redirectUrl);
  } catch (e) {
    logger.error(e);
    return sendLoginErrorResponse(e, res);
  }
};

const authorize = async (req, res) => {
  const redirectUrl = new URL(
    `/${environment.db}/oidc/get_token`,
    `${req.protocol}://${req.get('host')}`
  ).toString();
  const authUrl = await getAuthorizationUrl(ASConfig, redirectUrl);
  res.redirect(301, authUrl.href);
};

module.exports = {
  init,
  authorize,
  login
};
