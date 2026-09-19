const chai = require('chai');
const sinon = require('sinon');
const secureSettings = require('@medic/settings');

const service = require('../../../../src/services/offline-data-bundle/server-key');

const IDENTITY = 'AGE-SECRET-KEY-1SERVER';
const VAULT_KEY = 'offline-data-bundle-server-key:chw:device-1';

describe('offline-data-bundle server-key service', () => {
  afterEach(() => sinon.restore());

  it('setServerPrivateKey stores the identity under a key namespaced by user and device', async () => {
    const setCredentials = sinon.stub(secureSettings, 'setCredentials').resolves();

    await service.setServerPrivateKey('chw', 'device-1', IDENTITY);

    chai.expect(setCredentials.args[0]).to.deep.equal([VAULT_KEY, IDENTITY]);
  });

  it('getServerPrivateKey reads the identity back', async () => {
    sinon.stub(secureSettings, 'getCredentials').resolves(IDENTITY);

    const result = await service.getServerPrivateKey('chw', 'device-1');

    chai.expect(secureSettings.getCredentials.args[0]).to.deep.equal([VAULT_KEY]);
    chai.expect(result).to.equal(IDENTITY);
  });

  it('getServerPrivateKey returns nothing when the device was never registered', async () => {
    sinon.stub(secureSettings, 'getCredentials').resolves();

    chai.expect(await service.getServerPrivateKey('chw', 'device-1')).to.be.undefined;
  });
});
