const { expect } = require('chai');
const sinon = require('sinon');

const logger = require('@medic/logger');
const { DOC_IDS } = require('@medic/constants');
const extensionLibs = require('../src');

const encode = source => Buffer.from(source).toString('base64');

describe('extension-libs', () => {
  afterEach(() => {
    extensionLibs.set({});
    sinon.restore();
  });

  it('loads and exposes extension-lib attachments', async () => {
    const db = {
      get: sinon.stub().resolves({
        _attachments: {
          'double.js': { data: encode('module.exports = value => value + value;') },
          'unicode.js': { data: encode('module.exports = () => "नेपाली";') },
        },
      }),
    };

    const result = await extensionLibs.load(db);

    expect(db.get.calledOnceWithExactly(DOC_IDS.EXTENSION_LIBS, { attachments: true })).to.be.true;
    expect(result['double.js']('a')).to.equal('aa');
    expect(extensionLibs.get('unicode.js')()).to.equal('नेपाली');
    expect(extensionLibs.get('missing.js')).to.be.undefined;
    expect(extensionLibs.getAll()).to.deep.equal(result);
  });

  it('clears loaded libraries when the extension-libs document does not exist', async () => {
    extensionLibs.set({ 'old.js': () => 'old' });
    const db = { get: sinon.stub().rejects({ status: 404 }) };

    await extensionLibs.load(db);

    expect(extensionLibs.getAll()).to.deep.equal({});
  });

  it('ignores malformed attachments and loads valid attachments', async () => {
    sinon.stub(logger, 'error');
    const db = {
      get: sinon.stub().resolves({
        _attachments: {
          'invalid.js': { data: encode('this is not javascript') },
          'valid.js': { data: encode('module.exports = () => "valid";') },
        },
      }),
    };

    await extensionLibs.load(db);

    expect(extensionLibs.get('invalid.js')).to.be.undefined;
    expect(extensionLibs.get('valid.js')()).to.equal('valid');
    expect(logger.error.calledOnce).to.be.true;
  });

  it('loads an empty registry when no document is returned', async () => {
    extensionLibs.set({ 'old.js': () => 'old' });
    const db = { get: sinon.stub().resolves() };

    await extensionLibs.load(db);

    expect(extensionLibs.getAll()).to.deep.equal({});
  });

  it('rethrows database errors', async () => {
    const error = new Error('database unavailable');
    const db = { get: sinon.stub().rejects(error) };

    await expect(extensionLibs.load(db)).to.be.rejectedWith(error);
  });

  it('copies libraries when setting the registry', () => {
    const libs = { 'helper.js': () => 'value' };

    const result = extensionLibs.set(libs);
    delete libs['helper.js'];

    expect(result).to.equal(extensionLibs.getAll());
    expect(extensionLibs.get('helper.js')()).to.equal('value');
  });
});
