const secureSettings = require('@medic/settings');

const CREDENTIAL_KEY = 'offline-data-bundle-server-key';

// Vault key for the server's private key for one device. It must never live on the _users doc (a
// user can read their own _users doc via the CouchDB proxy), so it is kept in the secureSettings
// vault instead.
const vaultKey = (username, deviceId) => `${CREDENTIAL_KEY}:${username}:${deviceId}`;

module.exports = {
  // The server's age encryption identity for this device: the private half of the recipient the
  // device encrypts its bundles to.
  setServerPrivateKey: (username, deviceId, identity) => {
    return secureSettings.setCredentials(vaultKey(username, deviceId), identity);
  },

  getServerPrivateKey: (username, deviceId) => secureSettings.getCredentials(vaultKey(username, deviceId)),
};
