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

  describe('device server private keys', () => {
    const privateKeys = {
      encryption: 'AGE-SECRET-KEY-1SERVER',
      signing: { kty: 'OKP', crv: 'Ed25519', x: 'server-pub', d: 'server-priv' },
    };

    it('vaultKey namespaces by user and device', () => {
      chai.expect(service.vaultKey('chw', 'device-1')).to.equal('offline-data-bundle-server-key:chw:device-1');
    });

    it('setServerPrivateKeys stores the serialised privates under the vault key', async () => {
      const setCredentials = sinon.stub(secureSettings, 'setCredentials').resolves();

      await service.setServerPrivateKeys('chw', 'device-1', privateKeys);

      chai.expect(setCredentials.args[0]).to.deep.equal([
        'offline-data-bundle-server-key:chw:device-1',
        JSON.stringify(privateKeys),
      ]);
    });

    it('getServerPrivateKeys parses the stored value', async () => {
      sinon.stub(secureSettings, 'getCredentials').resolves(JSON.stringify(privateKeys));

      const result = await service.getServerPrivateKeys('chw', 'device-1');

      chai.expect(secureSettings.getCredentials.args[0]).to.deep.equal(['offline-data-bundle-server-key:chw:device-1']);
      chai.expect(result).to.deep.equal(privateKeys);
    });

    it('getServerPrivateKeys returns undefined when nothing is stored', async () => {
      sinon.stub(secureSettings, 'getCredentials').resolves();

      const result = await service.getServerPrivateKeys('chw', 'device-1');

      chai.expect(result).to.be.undefined;
    });
  });
});
