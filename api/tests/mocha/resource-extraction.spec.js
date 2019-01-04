const rewire = require('rewire'),
      resourceExtraction = rewire('../../src/resource-extraction'),
      sinon = require('sinon'),
      { expect } = require('chai'); // jshint ignore:line

let fakeDdoc, mockFs, mockDb;
resourceExtraction.__set__('logger', { debug: () => {} });
function doMocking(overwrites = {}) {
  const defaultAttachment = {
    'js/service-worker.js': { digest: 'current' },
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
    const expected = { content: 'foo' };
    doMocking(expected);
    resourceExtraction.run().then(() => {
      expect(mockFs.writeFile.callCount).to.eq(1);

      const [actualOutputPath, actualContent] = mockFs.writeFile.args[0];
      expect(actualOutputPath).to.include('src/extracted/js/service-worker.js');
      expect(actualContent).to.include(expected.content);
      done();
    });
  });

  it('unchanged files get written once', done => {
    const expected = { content: 'foo' };
    doMocking(expected);
    resourceExtraction.run()
      .then(resourceExtraction.run)
      .then(() => {
        expect(mockFs.writeFile.callCount).to.eq(1);

        const [actualOutputPath, actualContent] = mockFs.writeFile.args[0];
        expect(actualOutputPath).to.include('src/extracted/js/service-worker.js');
        expect(actualContent).to.include(expected.content);
        done();
      });
  });

  it('changed files get written again', done => {
    const expected = { content: 'foo' };
    doMocking(expected);
    resourceExtraction.run()
      .then(() => {
        fakeDdoc._attachments['js/service-worker.js'].digest = 'update';
        return resourceExtraction.run();
      })
      .then(() => {
        expect(mockFs.writeFile.callCount).to.eq(2);

        const [actualOutputPath, actualContent] = mockFs.writeFile.args[1];
        expect(actualOutputPath).to.include('src/extracted/js/service-worker.js');
        expect(actualContent).to.include(expected.content);
        done();
      });
  });

  it('non-cacheable attachments not written to disk', done => {
    doMocking({ attachments: { 'skip/me.js': {} }});
    resourceExtraction.run().then(() => {
      expect(mockFs.writeFile.callCount).to.eq(0);
      done();
    });
  });

  it('isAttachmentCacheable filter properly for specific resources', () => {
    const isAttachmentCacheable = resourceExtraction.__get__('isAttachmentCacheable');
    expect(isAttachmentCacheable('audio/alert.mp3')).to.eq(true);
    expect(isAttachmentCacheable('js/inbox.js')).to.eq(true);
    expect(isAttachmentCacheable('manifest.json')).to.eq(true);
    expect(isAttachmentCacheable('templates/inbox.html')).to.eq(true);

    expect(isAttachmentCacheable('translations/messages-en.properties')).to.eq(false);
  });

  it('creates destination folder as necessary', done => {
    doMocking();
    mockFs.existsSync.returns(false);
    mockFs.mkdirSync = sinon.stub().returns(true);
    resourceExtraction.run().then(() => {
      expect(mockFs.mkdirSync.callCount).to.eq(2);
      expect(mockFs.mkdirSync.args[0][0]).to.include('src/extracted');
      expect(mockFs.mkdirSync.args[1][0]).to.include('src/extracted/js');
      done();
    });
  });
});
