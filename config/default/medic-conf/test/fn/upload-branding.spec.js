const { expect } = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');
const environment = require('../../src/lib/environment');
const uploadBranding = rewire('../../src/fn/upload-branding');

describe('Upload Branding', () => {
  afterEach(() => {
    sinon.reset();
  });

  it('should call uploadConfigurationDocs with expected parameters', async () => {
    const configurationPath = `${environment.pathToProject}/branding.json`;
    const directoryPath = `${environment.pathToProject}/branding`;
    const dbDocName = 'branding';
    const uploadConfigurationDocs = sinon.stub().returns(Promise.resolve());

    return uploadBranding.__with__({ uploadConfigurationDocs })(async () => {
      await uploadBranding.execute();

      expect(uploadConfigurationDocs.args[0][0]).to.equal(configurationPath);
      expect(uploadConfigurationDocs.args[0][1]).to.equal(directoryPath);
      expect(uploadConfigurationDocs.args[0][2]).to.equal(dbDocName);
    });
  });
});
