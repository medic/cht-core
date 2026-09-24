const { expect } = require('chai');
const sinon = require('sinon');
const secureSettings = require('@medic/settings');

const service = require('../../../../src/services/offline-data-bundle/server-key');

const IDENTITY = 'AGE-SECRET-KEY-1SERVER';
const OLDER = 'AGE-SECRET-KEY-1OLDER';
const OLDEST = 'AGE-SECRET-KEY-1OLDEST';
const VAULT_KEY = 'offline-data-bundle-server-key:chw:device-1';

describe('offline-data-bundle server-key service', () => {
  let setCredentials;

  beforeEach(() => setCredentials = sinon.stub(secureSettings, 'setCredentials').resolves());
  afterEach(() => sinon.restore());

  const stored = (...identities) => sinon
    .stub(secureSettings, 'getCredentials')
    .resolves(identities.join('\n'));

  it('stores the identity under a key namespaced by user and device', async () => {
    stored();

    await service.setServerPrivateKey('chw', 'device-1', IDENTITY);

    expect(setCredentials.args[0]).to.deep.equal([VAULT_KEY, IDENTITY]);
  });

  it('reads the identity back', async () => {
    stored(IDENTITY);

    const result = await service.getServerPrivateKey('chw', 'device-1');

    expect(secureSettings.getCredentials.args[0]).to.deep.equal([VAULT_KEY]);
    expect(result).to.deep.equal([IDENTITY]);
  });

  it('returns nothing when the device was never registered', async () => {
    sinon.stub(secureSettings, 'getCredentials').resolves();

    expect(await service.getServerPrivateKey('chw', 'device-1')).to.deep.equal([]);
  });

  /**
   * A device that is reinstalled or replaced re-registers and gets a new identity, but a bundle it
   * sealed beforehand may still be travelling on a relay's phone, and that device no longer holds
   * the data. Dropping the old identity would lose it.
   */
  it('keeps the previous identities, newest first', async () => {
    stored(OLDER, OLDEST);

    await service.setServerPrivateKey('chw', 'device-1', IDENTITY);

    expect(setCredentials.args[0][1].split('\n')).to.deep.equal([IDENTITY, OLDER, OLDEST]);
  });

  it('keeps only the most recent few, so the vault entry cannot grow without limit', async () => {
    stored(OLDER, OLDEST, 'AGE-SECRET-KEY-1ANCIENT');

    await service.setServerPrivateKey('chw', 'device-1', IDENTITY);

    expect(setCredentials.args[0][1].split('\n')).to.deep.equal([IDENTITY, OLDER, OLDEST]);
  });

  it('does not keep the same identity twice when a device re-registers unchanged', async () => {
    stored(IDENTITY, OLDER);

    await service.setServerPrivateKey('chw', 'device-1', IDENTITY);

    expect(setCredentials.args[0][1].split('\n')).to.deep.equal([IDENTITY, OLDER]);
  });
});
