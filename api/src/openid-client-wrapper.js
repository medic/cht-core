// lib/oidc.js
const {
  discovery,
  randomPKCECodeVerifier,
  calculatePKCECodeChallenge,
  buildAuthorizationUrl,
  authorizationCodeGrant,
  allowInsecureRequests,
  ClientError,
  ResponseBodyError,
  AuthorizationResponseError,
  WWWAuthenticateChallengeError
} = require('openid-client');

module.exports = {
  discovery,
  randomPKCECodeVerifier,
  calculatePKCECodeChallenge,
  buildAuthorizationUrl,
  authorizationCodeGrant,
  allowInsecureRequests,
  ClientError,
  ResponseBodyError,
  AuthorizationResponseError,
  WWWAuthenticateChallengeError
};
