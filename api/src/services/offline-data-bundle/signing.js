// Signature helpers for offline data bundles, over ECDSA on P-256.
//
// Not Ed25519: the webapp generates these keys with Web Crypto so the private key can be kept
// non-extractable, and Web Crypto only offers Ed25519 from Chrome 137 while the webapp supports
// far older. P-256 is the usual stand-in and is built into Node, so no dependency is needed.
const { webcrypto } = require('node:crypto');

const ALGORITHM = { name: 'ECDSA', namedCurve: 'P-256' };
const VERIFY_PARAMS = { name: 'ECDSA', hash: 'SHA-256' };

module.exports = {
  isValidPublicKey: async (jwk) => {
    if (!jwk || typeof jwk !== 'object') {
      return false;
    }
    try {
      await webcrypto.subtle.importKey('jwk', jwk, ALGORITHM, true, ['verify']);
      return true;
    } catch {
      return false;
    }
  },

  // Verifies the signature. `publicKeyJwk` is the device's signing public key JWK (as stored
  // on the _users doc), `signatureBase64` the base64 signature, and `message` the signed bytes.
  // Returns false on any error (malformed key, malformed signature) so a bad bundle never throws.
  verify: async (publicKeyJwk, signatureBase64, message) => {
    try {
      const key = await webcrypto.subtle.importKey('jwk', publicKeyJwk, ALGORITHM, false, ['verify']);
      return await webcrypto.subtle.verify(
        VERIFY_PARAMS,
        key,
        Buffer.from(signatureBase64, 'base64'),
        message
      );
    } catch {
      return false;
    }
  },
};
