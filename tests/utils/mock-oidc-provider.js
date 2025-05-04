const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const path = require('path');

const { generateKeyPairSync } = require('crypto');
const { hostURL } = require('@utils');
const { BASE_URL, DB_NAME } = require('@constants');

const appTokenUrl = `${BASE_URL}/${DB_NAME}/login/oidc/get_token`;

const authenticatedRedirectUrl = `${appTokenUrl}?code=dummy`;

const getOidcBaseUrl = () => {
  const address = `${hostURL(3000)}`;
  console.log('address: ', address);
  return address;
};

const getJWT_KEYS = (secret = 'secret') => generateKeyPairSync(
  'rsa',
  {
    modulusLength: 4096,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
      cipher: 'aes-256-cbc',
      passphrase: secret
    }
  }
);

const generateIdToken =  (issuer, secret = 'secret') => {
  const payload = {
    issuer,
    algorithm: 'RS256',
    expiresIn: 3600,
  };
  const { privateKey }  = getJWT_KEYS();
  return jwt.sign(
    {
      preferred_username: 'testuser',
      sub: '12345',
      name: 'John Doe',
      aud: 'cht'
    },
    { key: privateKey.replace(/\\n/gm, '\n'), passphrase: secret },
    payload
  );
};

const mockApp = express();

mockApp.use(bodyParser.json());

mockApp.get('/.well-known/openid-configuration', (req, res) => {
  const oidcBaseUrl = getOidcBaseUrl();
  // using a dump of oidc spec example
  res.json({
    issuer: `${oidcBaseUrl}`,
    authorization_endpoint: path.join(oidcBaseUrl, 'connect/authorize'),
    token_endpoint: path.join(oidcBaseUrl, 'connect/token'),
    token_endpoint_auth_methods_supported: ['client_secret_basic', 'private_key_jwt'],
    token_endpoint_auth_signing_alg_values_supported: ['RS256', 'ES256'],
    userinfo_endpoint: path.join(oidcBaseUrl, 'connect/userinfo'),
    check_session_iframe: path.join(oidcBaseUrl, 'connect/check_session'),
    end_session_endpoint: path.join(oidcBaseUrl, 'connect/end_session'),
    jwks_uri: path.join(oidcBaseUrl, 'jwks.json'),
    registration_endpoint: path.join(oidcBaseUrl, '/connect/register'),
    scopes_supported: ['openid', 'profile', 'email'],
    response_types_supported: ['code', 'code id_token', 'id_token', 'id_token token'],
    acr_values_supported: ['urn:mace:incommon:iap:silver', 'urn:mace:incommon:iap:bronze'],
    subject_types_supported: ['public', 'pairwise'],
    userinfo_signing_alg_values_supported: ['RS256', 'ES256', 'HS256'],
    userinfo_encryption_alg_values_supported: ['RSA-OAEP-256', 'A128KW'],
    userinfo_encryption_enc_values_supported: ['A128CBC-HS256', 'A128GCM'],
    id_token_signing_alg_values_supported: ['RS256', 'ES256', 'HS256'],
    id_token_encryption_alg_values_supported: ['RSA-OAEP-256', 'A128KW'],
    id_token_encryption_enc_values_supported: ['A128CBC-HS256', 'A128GCM'],
    request_object_signing_alg_values_supported: ['none', 'RS256', 'ES256'],
    display_values_supported: ['page', 'popup'],
    claim_types_supported: ['normal', 'distributed'],
    claims_supported: [
      'sub', 'iss', 'auth_time', 'acr',
      'name', 'given_name', 'family_name', 'nickname',
      'profile', 'picture', 'website',
      'email', 'email_verified', 'locale', 'zoneinfo',
      'http://example.info/claims/groups'
    ],
    claims_parameter_supported: true,
    service_documentation: 'http://server.example.com/connect/service_documentation.html',
    ui_locales_supported: ['en-US']
  });
});

/**
 * For completeness.
 *
 * The integration tests do not actually invoke this for a response. The tests test test up until
 * the point of redirecting to this endpoint.
 */
mockApp.get('/connect/authorize', (req, res) => {
  res.redirect(302, authenticatedRedirectUrl);
});

mockApp.post('/connect/token', (req, res) => {
  const oidcBaseUrl = getOidcBaseUrl();
  res.json({
    access_token: 'SlAV32hkKG',
    token_type: 'Bearer',
    refresh_token: '8xLOxBtZp8',
    expires_in: 3600,
    id_token: generateIdToken(oidcBaseUrl)
  });
});

const startOidcServer = (callback) => {
  const server = mockApp.listen(3000, () => {
    callback();
  });
  return server;
};

const stopOidcServer = (server) => {
  server && server.close();
};

module.exports = {
  oidcBaseUrl: getOidcBaseUrl(),
  appTokenUrl,
  authenticatedRedirectUrl,
  startOidcServer,
  stopOidcServer
};
