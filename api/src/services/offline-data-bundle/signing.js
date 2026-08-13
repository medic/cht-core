// Ed25519 signature helpers for offline data bundles. Web Crypto Ed25519 is built into Node,
// so no external dependency is required. This is the future home for verify() too.
const { webcrypto } = require('node:crypto');

module.exports = {
  isValidPublicKey: async (base64Key) => {
    const raw = Buffer.from(base64Key, 'base64');
    if (raw.length !== 32) {
      return false;
    }
    try {
      await webcrypto.subtle.importKey('raw', raw, { name: 'Ed25519' }, false, ['verify']);
      return true;
    } catch {
      return false;
    }
  },
};
