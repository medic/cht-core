const chai = require('chai');
const { webcrypto } = require('node:crypto');

const service = require('../../../../src/services/offline-data-bundle/signing');

describe('offline-data-bundle signing service', () => {
  describe('isValidPublicKey', () => {
    let validJwk;

    before(async () => {
      const keyPair = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
      validJwk = await webcrypto.subtle.exportKey('jwk', keyPair.publicKey);
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

  describe('generateKeyPair', () => {
    it('generates an Ed25519 keypair exported as JWK', async () => {
      const { publicKey, privateKey } = await service.generateKeyPair();

      chai.expect(publicKey).to.include({ kty: 'OKP', crv: 'Ed25519' });
      chai.expect(publicKey.x).to.be.a('string');
      chai.expect(publicKey.d).to.be.undefined;
      chai.expect(privateKey).to.include({ kty: 'OKP', crv: 'Ed25519' });
      chai.expect(privateKey.d).to.be.a('string');
      chai.expect(await service.isValidPublicKey(publicKey)).to.be.true;
    });

    it('generates a distinct keypair on each call', async () => {
      const first = await service.generateKeyPair();
      const second = await service.generateKeyPair();
      chai.expect(first.publicKey.x).to.not.equal(second.publicKey.x);
    });
  });
});
