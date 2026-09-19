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
  // Decrypts an age ciphertext STREAM with the given identity. `ciphertext` is a web
  // ReadableStream of the raw age bytes; the returned value is a ReadableStream of the plaintext.
  // age authenticates every chunk, so a tampered or truncated stream errors while reading. The
  // header is parsed before this resolves, so a key that cannot decrypt fails before any payload
  // byte is handed back.
  decryptStream: async (identity, ciphertext) => {
    const decrypter = new (await load()).Decrypter();
    decrypter.addIdentity(identity);
    return decrypter.decrypt(ciphertext);
  },
};
