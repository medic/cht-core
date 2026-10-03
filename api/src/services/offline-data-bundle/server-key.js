const secureSettings = require('@medic/settings');
const { deviceKeys } = require('@medic/user-management');

// The key must never live on the _users doc (a user can read their own _users doc via the CouchDB
// proxy), so it is kept in the secureSettings vault instead. The vault key is built by
// user-management, which clears these entries on a password change: one composition, server side,
// so the two halves cannot drift and it stays out of the browser bundles.

module.exports = {
  // The server's age encryption identity for this device: the private half of the recipient the
  // device encrypts its bundles to.
  setServerPrivateKey: (username, deviceId, identity) => {
    return secureSettings.setCredentials(deviceKeys.vaultKey(username, deviceId), identity);
  },

  getServerPrivateKey: (username, deviceId) => secureSettings.getCredentials(deviceKeys.vaultKey(username, deviceId)),
};
