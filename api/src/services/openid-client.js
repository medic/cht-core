const {
  discovery,
  buildAuthorizationUrl,
  authorizationCodeGrant,
  allowInsecureRequests,
} = require('openid-client');

/*
 * Wrap the openid-client ESM dependency to enable unit testing.
 */
module.exports = {
  discovery,
  buildAuthorizationUrl,
  authorizationCodeGrant,
  allowInsecureRequests,
};
