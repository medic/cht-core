const { expect } = require('chai');
const sinon = require('sinon');
const secureSettings = require('@medic/settings');
const logger = require('@medic/logger');
const { clearDeviceKeys, destroyServerKeys } = require('../../../src/libs/device-keys');

describe('device-keys', () => {
  describe('clearDeviceKeys', () => {
    it('stops trusting every registered device and says which they were', () => {
      const user = {
        name: 'sally',
        keys_by_device: { 'device-a': { signing_public_key: {} }, 'device-b': { signing_public_key: {} } },
      };

      const revoked = clearDeviceKeys(user);

      // undefined rather than deleted, so the field is explicitly absent from whatever is written
      expect(user).to.have.property('keys_by_device', undefined);
      expect(revoked).to.deep.equal(['device-a', 'device-b']);
    });

    it('reports nothing to destroy when the user has no registered device', () => {
      expect(clearDeviceKeys({ name: 'sally' })).to.deep.equal([]);
    });
  });

  describe('destroyServerKeys', () => {
    afterEach(() => sinon.restore());

    it('overwrites the vault entry for each device', async () => {
      sinon.stub(secureSettings, 'setCredentials').resolves();

      await destroyServerKeys('sally', ['device-a', 'device-b']);

      expect(secureSettings.setCredentials.args).to.deep.equal([
        ['offline-data-bundle-server-key:sally:device-a', ''],
        ['offline-data-bundle-server-key:sally:device-b', ''],
      ]);
    });

    /**
     * The JSDoc says this must never throw, and that is load-bearing: on an instance whose CouchDB
     * secret is unset the vault rejects on every password change. Without this test the catch can
     * be deleted by a refactor and the whole suite stays green.
     */
    it('reports a vault failure instead of throwing', async () => {
      sinon.stub(secureSettings, 'setCredentials').rejects(new Error('vault down'));
      const logged = sinon.stub(logger, 'error');

      await destroyServerKeys('sally', ['device-a']);

      expect(logged.callCount).to.equal(1);
    });

    it('touches the vault for nothing when no device was revoked', async () => {
      sinon.stub(secureSettings, 'setCredentials').resolves();

      await destroyServerKeys('sally', []);

      expect(secureSettings.setCredentials.notCalled).to.be.true;
    });
  });
});
