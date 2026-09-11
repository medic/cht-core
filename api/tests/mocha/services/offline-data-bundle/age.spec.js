const chai = require('chai');

const service = require('../../../../src/services/offline-data-bundle/age');

describe('offline-data-bundle age service', () => {
  describe('isValidRecipient', () => {
    it('returns true for a real age recipient', async () => {
      const identity = await service.generateIdentity();
      const recipient = await service.identityToRecipient(identity);
      chai.expect(await service.isValidRecipient(recipient)).to.be.true;
    });

    it('returns false for garbage input', async () => {
      chai.expect(await service.isValidRecipient('not-a-recipient')).to.be.false;
    });

    it('returns false for an empty string', async () => {
      chai.expect(await service.isValidRecipient('')).to.be.false;
    });
  });

  describe('encrypt / decrypt round-trip', () => {
    it('encrypts to a recipient and decrypts with the matching identity', async () => {
      const identity = await service.generateIdentity();
      const recipient = await service.identityToRecipient(identity);
      const plaintext = Buffer.from('hello checkpoint', 'utf8');

      const ciphertext = await service.encrypt(recipient, plaintext);
      const decrypted = await service.decrypt(identity, ciphertext);

      chai.expect(Buffer.from(decrypted).toString('utf8')).to.equal('hello checkpoint');
    });

    it('produces ciphertext a non-matching identity cannot decrypt', async () => {
      const recipient = await service.identityToRecipient(await service.generateIdentity());
      const otherIdentity = await service.generateIdentity();
      const ciphertext = await service.encrypt(recipient, Buffer.from('secret', 'utf8'));

      let threw = false;
      try {
        await service.decrypt(otherIdentity, ciphertext);
      } catch {
        threw = true;
      }
      chai.expect(threw).to.be.true;
    });
  });
});
