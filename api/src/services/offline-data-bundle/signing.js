// Ed25519 signature helpers for offline data bundles. Web Crypto Ed25519 is built into Node,
// so no external dependency is required. This is the future home for verify() too.
const { webcrypto } = require('node:crypto');

module.exports = {
  isValidPublicKey: async (jwk) => {
    if (!jwk || typeof jwk !== 'object') {
      return false;
    }
    try {
      await webcrypto.subtle.importKey('jwk', jwk, { name: 'Ed25519' }, true, ['verify']);
      return true;
    } catch {
      return false;
    }
  },

  // Generates a server Ed25519 signing keypair and exports both halves as JWK.
  generateKeyPair: async () => {
    const keyPair = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
    const [publicKey, privateKey] = await Promise.all([
      webcrypto.subtle.exportKey('jwk', keyPair.publicKey),
      webcrypto.subtle.exportKey('jwk', keyPair.privateKey),
    ]);
    return { publicKey, privateKey };
  },
};
