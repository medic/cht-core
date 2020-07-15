const rewire = require('rewire');
const resourceExtraction = rewire('../../src/resource-extraction');
const sinon = require('sinon');
const { expect } = require('chai'); // jshint ignore:line

let fakeDdoc; let mockFs; let 
  mockDb;
resourceExtraction.__set__('logger', { debug: () => {} });
function doMocking(overwrites = {}) {
  const defaultAttachment = {
    'js/attached.js': { digest: 'current' },
  };

  fakeDdoc = {
    _id: '_design/medic',
    _attachments: overwrites.attachments || defaultAttachment,
  };

  mockFs = {
    existsSync: sinon.stub().returns(true),
    writeFile: sinon.spy((a, b, callback) => callback()),
  };
  mockDb = {
    medic: {
      get: sinon.stub().resolves(fakeDdoc),
      getAttachment: sinon.stub().resolves(overwrites.content),
    },
  };
  resourceExtraction.__set__('fs', mockFs);
  resourceExtraction.__set__('db', mockDb);
  resourceExtraction.clearCache();
}

describe('Resource Extraction', () => {
  it('attachments written to disk', done => {
    const expected = { content: { toString: () => 'foo' } };
    doMocking(expected);
    return resourceExtraction.run().then(() => {
      expect(mockFs.writeFile.callCount).to.eq(1);

      const [actualOutputPath, actualContent] = mockFs.writeFile.args[0];
      expect(actualOutputPath).to.include('src/extracted-resources/js/attached.js');
      expect(actualContent).to.include(expected.content);
      done();
    });
  });

  it('unchanged files get written once', done => {
    const expected = { content: 'foo' };
    doMocking(expected);
    return resourceExtraction.run()
      .then(resourceExtraction.run)
      .then(() => {
        expect(mockFs.writeFile.callCount).to.eq(1);

        const [actualOutputPath, actualContent] = mockFs.writeFile.args[0];
        expect(actualOutputPath).to.include('src/extracted-resources/js/attached.js');
        expect(actualContent).to.include(expected.content);
        done();
      });
  });

  it('changed files get written again', done => {
    const expected = { content: 'foo' };
    doMocking(expected);
    return resourceExtraction.run()
      .then(() => {
        fakeDdoc._attachments['js/attached.js'].digest = 'update';
        return resourceExtraction.run();
      })
      .then(() => {
        expect(mockFs.writeFile.callCount).to.eq(2);

        const [actualOutputPath, actualContent] = mockFs.writeFile.args[1];
        expect(actualOutputPath).to.include('src/extracted-resources/js/attached.js');
        expect(actualContent).to.include(expected.content);
        done();
      });
  });

  it('non-cacheable attachments not written to disk', done => {
    doMocking({ attachments: { 'skip/me.js': {} }});
    return resourceExtraction.run().then(() => {
      expect(mockFs.writeFile.callCount).to.eq(0);
      done();
    });
  });

  it('isAttachmentExtractable filter properly for specific resources', () => {
    const isAttachmentExtractable = resourceExtraction.__get__('isAttachmentExtractable');
    expect(isAttachmentExtractable('audio/alert.mp3')).to.eq(true);
    expect(isAttachmentExtractable('js/inbox.js')).to.eq(true);
    expect(isAttachmentExtractable('manifest.json')).to.eq(true);
    expect(isAttachmentExtractable('default-docs/settings.doc.json')).to.eq(true);
    expect(isAttachmentExtractable('templates/inbox.html')).to.eq(true);

    expect(isAttachmentExtractable('translations/messages-en.properties')).to.eq(false);
  });

  it('creates destination folder as necessary', done => {
    doMocking();
    mockFs.existsSync.returns(false);
    mockFs.mkdirSync = sinon.stub().returns(true);
    return resourceExtraction.run().then(() => {
      expect(mockFs.mkdirSync.callCount).to.eq(2);
      expect(mockFs.mkdirSync.args[0][0]).to.include('src/extracted-resources');
      expect(mockFs.mkdirSync.args[1][0]).to.include('src/extracted-resources/js');
      done();
    });
  });
});
