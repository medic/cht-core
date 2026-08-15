// age-encryption (typage) is an ESM-only module. This wrapper is the single boundary that
// loads it, via a lazy dynamic import
let agePromise;
const load = () => {
  if (!agePromise) {
    // eslint-disable-next-line n/no-extraneous-import
    agePromise = import('age-encryption');
  }
  return agePromise;
};

module.exports = {
  generateIdentity: async () => (await load()).generateIdentity(),
  identityToRecipient: async (identity) => (await load()).identityToRecipient(identity),
  isValidRecipient: async (recipient) => {
    try {
      new (await load()).Encrypter().addRecipient(recipient);
      return true;
    } catch {
      return false;
    }
  },
};
