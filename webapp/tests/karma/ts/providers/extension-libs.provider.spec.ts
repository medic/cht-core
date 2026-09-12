import { expect } from 'chai';
import sinon from 'sinon';
import * as extensionLibs from '@medic/extension-libs';

import { loadExtensionLibs } from '@mm-providers/extension-libs.provider';

describe('Extension libs provider', () => {
  afterEach(() => {
    extensionLibs.set({});
    sinon.restore();
  });

  it('loads extension libs before application startup', async () => {
    const medicDb = {
      get: sinon.stub().resolves({
        _attachments: {
          'uppercase.js': { data: btoa('module.exports = value => value.toUpperCase()') },
        },
      }),
    };
    const dbService = { get: sinon.stub().returns(medicDb) };

    await loadExtensionLibs(dbService as any)();

    expect(dbService.get.calledOnceWithExactly()).to.be.true;
    expect(medicDb.get.calledOnceWithExactly('extension-libs', { attachments: true })).to.be.true;
    expect(extensionLibs.get('uppercase.js')('hello')).to.equal('HELLO');
  });

  it('does not block application startup when loading fails', async () => {
    const error = new Error('unavailable');
    const dbService = { get: sinon.stub().returns({ get: sinon.stub().rejects(error) }) };
    const logError = sinon.stub(console, 'error');

    await loadExtensionLibs(dbService as any)();

    expect(logError.calledOnceWithExactly('Error loading extension libs - starting up anyway', error)).to.be.true;
  });
});
