const { expect } = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');
const environment = require('../../src/lib/environment');
const uploadPartners = rewire('../../src/fn/upload-partners');

describe('Upload Partners', () => {
  afterEach(() => {
    sinon.reset();
  });

  it('should call uploadConfigurationDocs with expected parameters', async () => {
    const configurationPath = `${environment.pathToProject}/partners.json`;
    const directoryPath = `${environment.pathToProject}/partners`;
    const dbDocName = 'partners';
    const uploadConfigurationDocs = sinon.stub().returns(Promise.resolve());

    return uploadPartners.__with__({ uploadConfigurationDocs })(async () => {
      await uploadPartners.execute();

      expect(uploadConfigurationDocs.args[0][0]).to.equal(configurationPath);
      expect(uploadConfigurationDocs.args[0][1]).to.equal(directoryPath);
      expect(uploadConfigurationDocs.args[0][2]).to.equal(dbDocName);
    });
  });
});
