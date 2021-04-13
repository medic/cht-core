const { expect } = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');
const environment = require('../../src/lib/environment');
const uploadResources = rewire('../../src/fn/upload-resources');

describe('Upload Resources', () => {
  afterEach(() => {
    sinon.reset();
  });

  it('should call uploadConfigurationDocs with expected parameters', async () => {
    const configurationPath = `${environment.pathToProject}/resources.json`;
    const directoryPath = `${environment.pathToProject}/resources`;
    const dbDocName = 'resources';
    const uploadConfigurationDocs = sinon.stub().returns(Promise.resolve());

    return uploadResources.__with__({ uploadConfigurationDocs })(async () => {
      await uploadResources.execute();

      expect(uploadConfigurationDocs.args[0][0]).to.equal(configurationPath);
      expect(uploadConfigurationDocs.args[0][1]).to.equal(directoryPath);
      expect(uploadConfigurationDocs.args[0][2]).to.equal(dbDocName);
    });
  });
});
