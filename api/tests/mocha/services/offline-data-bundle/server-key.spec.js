const chai = require('chai');
const sinon = require('sinon');
const secureSettings = require('@medic/settings');
const age = require('../../../../src/services/offline-data-bundle/age');

const service = require('../../../../src/services/offline-data-bundle/server-key');

const CREDENTIAL_KEY = 'offline-data-bundle-server-key';

describe('offline-data-bundle server-key service', () => {
  afterEach(() => sinon.restore());

  describe('getServerPublicKey', () => {
    it('generates and persists a new identity when none is stored', async () => {
      sinon.stub(secureSettings, 'getCredentials').resolves();
      const setCredentials = sinon.stub(secureSettings, 'setCredentials').resolves();

      const recipient = await service.getServerPublicKey();

      chai.expect(secureSettings.getCredentials.args[0]).to.deep.equal([CREDENTIAL_KEY]);
      chai.expect(setCredentials.callCount).to.equal(1);
      chai.expect(setCredentials.args[0][0]).to.equal(CREDENTIAL_KEY);
      chai.expect(setCredentials.args[0][1]).to.match(/^AGE-SECRET-KEY-1/);
      chai.expect(recipient).to.match(/^age1/);
      chai.expect(recipient).to.equal(await age.identityToRecipient(setCredentials.args[0][1]));
    });

    it('returns the recipient for the stored identity without regenerating', async () => {
      const identity = await age.generateIdentity();
      sinon.stub(secureSettings, 'getCredentials').resolves(identity);
      const setCredentials = sinon.stub(secureSettings, 'setCredentials').resolves();

      const recipient = await service.getServerPublicKey();

      chai.expect(setCredentials.notCalled).to.be.true;
      chai.expect(recipient).to.equal(await age.identityToRecipient(identity));
    });
  });
});
