const { expect } = require('chai');
const sinon = require('sinon');
const secureSettings = require('@medic/settings');
const logger = require('@medic/logger');
const { clearDeviceKeys } = require('../../../src/libs/device-keys');

describe('device-keys', () => {
  describe('clearDeviceKeys', () => {
    afterEach(() => sinon.restore());

    it('stops trusting every registered device, on the doc and in the vault', async () => {
      sinon.stub(secureSettings, 'deleteCredentials').resolves();
      const user = {
        name: 'sally',
        keys_by_device: { 'device-a': { signing_public_key: {} }, 'device-b': { signing_public_key: {} } },
      };

      await clearDeviceKeys(user);

      // undefined rather than deleted, so the field is explicitly absent from whatever is written
      expect(user).to.have.property('keys_by_device', undefined);
      expect(secureSettings.deleteCredentials.args).to.deep.equal([
        ['offline-data-bundle-server-key:sally:device-a'],
        ['offline-data-bundle-server-key:sally:device-b'],
      ]);
    });

    it('leaves the user and the vault alone when no device is registered', async () => {
      sinon.stub(secureSettings, 'deleteCredentials').resolves();
      const user = { name: 'sally' };

      await clearDeviceKeys(user);

      expect(user).to.deep.equal({ name: 'sally' });
      expect(secureSettings.deleteCredentials.notCalled).to.be.true;
    });

    // The user doc no longer naming the device is enough to refuse its bundles, so a vault failure
    // must not fail the password change.
    it('reports a vault failure instead of throwing', async () => {
      sinon.stub(secureSettings, 'deleteCredentials').rejects(new Error('vault down'));
      const logged = sinon.stub(logger, 'error');
      const user = { name: 'sally', keys_by_device: { 'device-a': {} } };

      await clearDeviceKeys(user);

      expect(user).to.have.property('keys_by_device', undefined);
      expect(logged.callCount).to.equal(1);
    });
  });
});
