const { expect } = require('chai');
const sinon = require('sinon');
const api = require('../api-stub');
const rewire = require('rewire');
const uploadConfigurationDocs = rewire('../../src/lib/upload-configuration-docs');

describe('Upload Configuration Docs', () => {
  let fs;
  let warn;
  let pouch;
  let warnUploadOverwrite;
  let insertOrReplace;
  let attachmentsFromDir;
  let configuration = {
    title: 'ABC Company',
    resources: {
      greatCompany: 'greatCompany.png',
      aliasCompany: 'aliasCompany.png'
    }
  };

  beforeEach(() => {
    api.start();
    fs = {
      exists: () => true,
      readJson: () => configuration,
      path: {
        resolve: () => 'path/configuration.json'
      }
    };
    warnUploadOverwrite = {
      preUploadDoc: sinon.stub(),
      postUploadDoc: sinon.stub()
    };
    warn = sinon.stub();
    pouch = sinon.stub();
    insertOrReplace = sinon.stub();
    attachmentsFromDir = sinon.stub();
  });

  afterEach(() => {
    api.stop();
    sinon.reset();
  });

  it('should upload configuration', async () => {
    warnUploadOverwrite.preUploadDoc.returns(true);
    insertOrReplace.returns(Promise.resolve());
    attachmentsFromDir.returns({ 'greatCompany.png': {} });

    const configurationDoc = {
      _id: 'configurationDoc',
      title: 'ABC Company',
      resources: {
        greatCompany: 'greatCompany.png',
        aliasCompany: 'aliasCompany.png'
      },
      _attachments: { 'greatCompany.png': {} }
    };
    const rewireWith = {
      fs,
      pouch,
      attachmentsFromDir,
      warnUploadOverwrite,
      insertOrReplace
    };

    return uploadConfigurationDocs.__with__(rewireWith)(async () => {
      await uploadConfigurationDocs('path/configuration.json', 'path/configuration', 'configurationDoc');

      expect(attachmentsFromDir.called).to.be.true;
      expect(pouch.called).to.be.true;
      expect(warnUploadOverwrite.preUploadDoc.args[0][1]).to.deep.include(configurationDoc);
      expect(warnUploadOverwrite.postUploadDoc.args[0][1]).to.deep.include(configurationDoc);
      expect(insertOrReplace.args[0][1]).to.deep.include(configurationDoc);
    });
  });

  it('should call processJson when provided', async () => {
    warnUploadOverwrite.preUploadDoc.returns(true);
    insertOrReplace.returns(Promise.resolve());
    attachmentsFromDir.returns({ 'greatCompany.png': {} });

    const configurationDoc = {
      _id: 'configurationDoc',
      customSection: {
        title: 'ABC Company'
      },
      _attachments: { 'greatCompany.png': {} }
    };
    const rewireWith = {
      fs,
      pouch,
      attachmentsFromDir,
      warnUploadOverwrite,
      insertOrReplace
    };
    const processJson = (json) => {
      return {
        customSection: { title: json.title },
        resources: json.resources
      };
    };

    return uploadConfigurationDocs.__with__(rewireWith)(async () => {
      await uploadConfigurationDocs('path/configuration.json', 'path/configuration', 'configurationDoc', processJson);

      expect(attachmentsFromDir.called).to.be.true;
      expect(pouch.called).to.be.true;
      expect(warnUploadOverwrite.preUploadDoc.args[0][1]).to.deep.include(configurationDoc);
      expect(warnUploadOverwrite.postUploadDoc.args[0][1]).to.deep.include(configurationDoc);
      expect(insertOrReplace.args[0][1]).to.deep.include(configurationDoc);
    });
  });

  it('should warn when paths no provided', async () => {
    fs.exists = () => false;
    const rewireWith = {
      fs,
      warn,
      pouch,
      attachmentsFromDir,
      warnUploadOverwrite,
      insertOrReplace
    };

    return uploadConfigurationDocs.__with__(rewireWith)(async () => {
      await uploadConfigurationDocs('configuration.js', 'configuration', 'configuration');

      expect(warn.called).to.be.true;
      expect(attachmentsFromDir.called).to.be.false;
      expect(pouch.called).to.be.false;
      expect(warnUploadOverwrite.preUploadDoc.called).to.be.false;
      expect(insertOrReplace.called).to.be.false;
    });
  });

  it('should warn when config file doesnt exists', async () => {
    fs.exists = () => false;
    const rewireWith = {
      fs,
      warn,
      pouch,
      attachmentsFromDir,
      warnUploadOverwrite,
      insertOrReplace
    };

    return uploadConfigurationDocs.__with__(rewireWith)(async () => {
      await uploadConfigurationDocs('configuration.js', 'configuration', 'configuration');

      expect(warn.called).to.be.true;
      expect(attachmentsFromDir.called).to.be.false;
      expect(pouch.called).to.be.false;
      expect(warnUploadOverwrite.preUploadDoc.called).to.be.false;
      expect(insertOrReplace.called).to.be.false;
    });
  });

  it('should inform when no changes detected', async () => {
    warnUploadOverwrite.preUploadDoc.returns(false);
    insertOrReplace.returns(Promise.resolve());
    attachmentsFromDir.returns({ image: {} });
    const info = sinon.stub();
    const rewireWith = {
      fs,
      info,
      pouch,
      attachmentsFromDir,
      warnUploadOverwrite,
      insertOrReplace
    };

    return uploadConfigurationDocs.__with__(rewireWith)(async () => {
      await uploadConfigurationDocs('configuration.js', 'configuration', 'configuration');

      expect(info.called).to.be.true;
      expect(attachmentsFromDir.called).to.be.true;
      expect(pouch.called).to.be.true;
      expect(warnUploadOverwrite.preUploadDoc.called).to.be.true;
      expect(warnUploadOverwrite.postUploadDoc.called).to.be.true;
      expect(insertOrReplace.called).to.be.false;
    });
  });
});
