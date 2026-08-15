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

  // Encrypts plaintext bytes to the given age recipient string. `plaintext` is a Uint8Array/Buffer;
  // returns the age ciphertext as a Uint8Array. Throws if the recipient string is invalid.
  encrypt: async (recipient, plaintext) => {
    const encrypter = new (await load()).Encrypter();
    encrypter.addRecipient(recipient);
    return encrypter.encrypt(plaintext);
  },

  // Decrypts age ciphertext with the given identity (age secret key string). Returns the
  // plaintext as a Uint8Array. Throws if the identity cannot decrypt the ciphertext.
  decrypt: async (identity, ciphertext) => {
    const decrypter = new (await load()).Decrypter();
    decrypter.addIdentity(identity);
    return decrypter.decrypt(ciphertext, 'uint8array');
  },
};
