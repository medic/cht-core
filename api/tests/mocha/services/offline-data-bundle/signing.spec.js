const chai = require('chai');
const { webcrypto } = require('node:crypto');

const service = require('../../../../src/services/offline-data-bundle/signing');

// The service only ever verifies, so the test plays the device's part and signs with webcrypto.
const deviceKeyPair = async () => {
  const keyPair = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  return {
    publicKey: await webcrypto.subtle.exportKey('jwk', keyPair.publicKey),
    sign: async (message) => {
      const signature = await webcrypto.subtle.sign({ name: 'Ed25519' }, keyPair.privateKey, message);
      return Buffer.from(signature).toString('base64');
    },
  };
};

describe('offline-data-bundle signing service', () => {
  describe('isValidPublicKey', () => {
    let validJwk;

    before(async () => {
      validJwk = (await deviceKeyPair()).publicKey;
    });

    it('returns true for a real Ed25519 public key JWK', async () => {
      chai.expect(await service.isValidPublicKey(validJwk)).to.be.true;
    });

    it('returns false for a JWK with the wrong key material', async () => {
      chai.expect(await service.isValidPublicKey({ kty: 'OKP', crv: 'Ed25519', x: 'not-a-key' })).to.be.false;
    });

    it('returns false for a non-object input', async () => {
      chai.expect(await service.isValidPublicKey('not-a-jwk')).to.be.false;
    });

    it('returns false for null', async () => {
      chai.expect(await service.isValidPublicKey(null)).to.be.false;
    });
  });

  describe('verify', () => {
    it('accepts a signature made by the matching private key', async () => {
      const device = await deviceKeyPair();
      const message = Buffer.from('envelope bytes', 'utf8');

      const signature = await device.sign(message);

      chai.expect(await service.verify(device.publicKey, signature, message)).to.be.true;
    });

    it('rejects a signature over a different message', async () => {
      const device = await deviceKeyPair();

      const signature = await device.sign(Buffer.from('a', 'utf8'));

      chai.expect(await service.verify(device.publicKey, signature, Buffer.from('b', 'utf8'))).to.be.false;
    });

    it('rejects a signature made by another device', async () => {
      const device = await deviceKeyPair();
      const other = await deviceKeyPair();
      const message = Buffer.from('envelope bytes', 'utf8');

      chai.expect(await service.verify(device.publicKey, await other.sign(message), message)).to.be.false;
    });

    it('returns false rather than throwing on a malformed key', async () => {
      chai.expect(await service.verify({ kty: 'oops' }, 'c2ln', Buffer.from('a'))).to.be.false;
    });
  });
});
