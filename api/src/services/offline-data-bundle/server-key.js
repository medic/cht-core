const age = require('age-encryption');
const secureSettings = require('@medic/settings');

const CREDENTIAL_KEY = 'offline-data-bundle-server-key';

const getServerIdentity = async () => {
  const identity = await secureSettings.getCredentials(CREDENTIAL_KEY);
  if (identity) {
    return identity;
  }
  const generated = await age.generateIdentity();
  await secureSettings.setCredentials(CREDENTIAL_KEY, generated);
  return generated;
};

module.exports = {
  getServerPublicKey: async () => {
    const identity = await getServerIdentity();
    return age.identityToRecipient(identity);
  },
};
