const secureSettings = require('@medic/settings');
const age = require('./age');

const CREDENTIAL_KEY = 'offline-data-bundle-server-key';

// Vault key for a device's server PRIVATE keys. These must never live on the _users doc (a user can
// read their own _users doc via the CouchDB proxy), so they are kept in the secureSettings vault.
const vaultKey = (username, deviceId) => `${CREDENTIAL_KEY}:${username}:${deviceId}`;

const getServerIdentity = async () => {
  const stored = await secureSettings.getCredentials(CREDENTIAL_KEY);
  if (stored) {
    return stored;
  }
  const identity = await age.generateIdentity();
  await secureSettings.setCredentials(CREDENTIAL_KEY, identity);
  return identity;
};

module.exports = {
  getServerPublicKey: async () => {
    const identity = await getServerIdentity();
    return age.identityToRecipient(identity);
  },

  vaultKey,

  // secureSettings stores a single string value, so both privates are serialised into one object.
  setServerPrivateKeys: (username, deviceId, privateKeys) => {
    return secureSettings.setCredentials(vaultKey(username, deviceId), JSON.stringify(privateKeys));
  },

  getServerPrivateKeys: async (username, deviceId) => {
    const stored = await secureSettings.getCredentials(vaultKey(username, deviceId));
    return stored ? JSON.parse(stored) : undefined;
  },
};
