const chai = require('chai');
const { webcrypto } = require('node:crypto');

const service = require('../../../../src/services/offline-data-bundle/signing');

describe('offline-data-bundle signing service', () => {
  describe('isValidPublicKey', () => {
    let validKey;

    before(async () => {
      const keyPair = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
      const raw = Buffer.from(await webcrypto.subtle.exportKey('raw', keyPair.publicKey));
      validKey = raw.toString('base64');
    });

    it('returns true for a real base64 Ed25519 public key', async () => {
      chai.expect(await service.isValidPublicKey(validKey)).to.be.true;
    });

    it('returns false for garbage input', async () => {
      chai.expect(await service.isValidPublicKey('not-a-key')).to.be.false;
    });

    it('returns false when the decoded key is the wrong length', async () => {
      const tooShort = Buffer.from('deadbeef', 'hex').toString('base64');
      chai.expect(await service.isValidPublicKey(tooShort)).to.be.false;
    });

    it('returns false for an empty string', async () => {
      chai.expect(await service.isValidPublicKey('')).to.be.false;
    });
  });
});
