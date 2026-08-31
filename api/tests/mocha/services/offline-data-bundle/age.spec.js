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
});
