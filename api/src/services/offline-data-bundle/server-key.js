const secureSettings = require('@medic/settings');
const age = require('./age');

const CREDENTIAL_KEY = 'offline-data-bundle-server-key';

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
};
