// Ed25519 signature helpers for offline data bundles. Web Crypto Ed25519 is built into Node,
// so no external dependency is required.
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

  // Signs `message` bytes (Buffer/Uint8Array) with the server's per-device Ed25519 signing private
  // key JWK. Returns the base64-encoded signature. Unlike `verify`, this throws on a bad key: a
  // signing failure is a server fault, not attacker-controlled input.
  sign: async (privateKeyJwk, message) => {
    const key = await webcrypto.subtle.importKey('jwk', privateKeyJwk, { name: 'Ed25519' }, false, ['sign']);
    const signature = await webcrypto.subtle.sign({ name: 'Ed25519' }, key, message);
    return Buffer.from(signature).toString('base64');
  },

  // Verifies an Ed25519 signature. `publicKeyJwk` is the device's signing public key JWK (as stored
  // on the _users doc), `signatureBase64` the base64 signature, and `message` the signed bytes.
  // Returns false on any error (malformed key, malformed signature) so a bad bundle never throws.
  verify: async (publicKeyJwk, signatureBase64, message) => {
    try {
      const key = await webcrypto.subtle.importKey('jwk', publicKeyJwk, { name: 'Ed25519' }, false, ['verify']);
      return await webcrypto.subtle.verify(
        { name: 'Ed25519' },
        key,
        Buffer.from(signatureBase64, 'base64'),
        message
      );
    } catch {
      return false;
    }
  },
};
