// age-encryption (typage) is an ESM-only module. This wrapper is the single boundary that
// loads it, via a lazy dynamic import
let agePromise;
const load = () => {
  if (!agePromise) {
    agePromise = import('age-encryption');
  }
  return agePromise;
};

module.exports = {
  generateIdentity: async () => (await load()).generateIdentity(),
  identityToRecipient: async (identity) => (await load()).identityToRecipient(identity),
};
