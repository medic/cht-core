const secureSettings = require('@medic/settings');
const { PREFIXES } = require('@medic/constants');

// Vault key for the server's private key for one device. It must never live on the _users doc (a
// user can read their own _users doc via the CouchDB proxy), so it is kept in the secureSettings
// vault instead.
const vaultKey = (username, deviceId) => `${PREFIXES.OFFLINE_DATA_BUNDLE_SERVER_KEY}${username}:${deviceId}`;

// How many of a device's identities to keep.
//
// Signing out clears a device's keys, so it registers a new identity at every sign-in, and a bundle
// sealed under an older one may still be on a relay's phone. Replacing the identity outright would
// leave that bundle undecryptable. The last three are kept, so a bundle sealed before the latest
// three sign-ins can no longer be opened.
const KEPT_IDENTITIES = 3;

const SEPARATOR = '\n';

module.exports = {
  // The server's age encryption identities for this device, newest first: the private halves of the
  // recipients the device has encrypted its bundles to.
  setServerPrivateKey: async (username, deviceId, identity) => {
    const previous = await module.exports.getServerPrivateKey(username, deviceId);
    const identities = [identity, ...previous.filter(kept => kept !== identity)].slice(0, KEPT_IDENTITIES);
    return secureSettings.setCredentials(vaultKey(username, deviceId), identities.join(SEPARATOR));
  },

  /** @returns every identity this device may have sealed to, newest first. Empty if unregistered. */
  getServerPrivateKey: async (username, deviceId) => {
    const stored = await secureSettings.getCredentials(vaultKey(username, deviceId));
    return stored ? stored.split(SEPARATOR).filter(identity => identity.length) : [];
  },
};
