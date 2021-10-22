const rewire = require('rewire');
const resourceExtraction = rewire('../../src/resource-extraction');
const sinon = require('sinon');
const { expect } = require('chai'); // jshint ignore:line
const db = require('../../src/db');
const fs = require('fs');

let fakeDdoc;

resourceExtraction.__set__('logger', { debug: () => {} });

const doMocking = (overwrites = {}) => {
  const defaultAttachment = {
    'js/attached.js': { digest: 'current' },
  };

  fakeDdoc = {
    _id: '_design/medic',
    _attachments: overwrites.attachments || defaultAttachment,
  };

  sinon.stub(db.medic, 'get').resolves(fakeDdoc);
  sinon.stub(db.medic, 'getAttachment').resolves(overwrites.content);
  sinon.stub(fs, 'existsSync').returns(true);
  sinon.stub(fs, 'writeFile').callsArg(2);
  sinon.stub(fs, 'unlinkSync');
  sinon.stub(fs, 'rmdirSync');
  sinon.stub(fs, 'readdirSync').returns([]);
  sinon.stub(fs, 'statSync');

  resourceExtraction.clearCache();
};

describe('Resource Extraction', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('attachments written to disk', () => {
    const expected = { content: { toString: () => 'foo' } };
    doMocking(expected);
    return resourceExtraction.run().then(() => {
      expect(fs.writeFile.callCount).to.eq(1);

      const [actualOutputPath, actualContent] = fs.writeFile.args[0];
      expect(actualOutputPath).to.include('/extracted-resources/js/attached.js');
      expect(actualContent).to.include(expected.content);
    });
  });

  it('unchanged files get written once', () => {
    const expected = { content: 'foo' };
    doMocking(expected);
    return resourceExtraction.run()
      .then(resourceExtraction.run)
      .then(() => {
        expect(fs.writeFile.callCount).to.eq(1);

        const [actualOutputPath, actualContent] = fs.writeFile.args[0];
        expect(actualOutputPath).to.include('/extracted-resources/js/attached.js');
        expect(actualContent).to.include(expected.content);
      });
  });

  it('changed files get written again', () => {
    const expected = { content: 'foo' };
    doMocking(expected);
    return resourceExtraction.run()
      .then(() => {
        fakeDdoc._attachments['js/attached.js'].digest = 'update';
        return resourceExtraction.run();
      })
      .then(() => {
        expect(fs.writeFile.callCount).to.eq(2);

        const [actualOutputPath, actualContent] = fs.writeFile.args[1];
        expect(actualOutputPath).to.include('/extracted-resources/js/attached.js');
        expect(actualContent).to.include(expected.content);
      });
  });

  it('non-cacheable attachments not written to disk', () => {
    doMocking({ attachments: { 'skip/me.js': {} }});
    return resourceExtraction.run().then(() => {
      expect(fs.writeFile.callCount).to.eq(0);
    });
  });

  it('isAttachmentExtractable filter properly for specific resources', () => {
    const isAttachmentExtractable = resourceExtraction.__get__('isAttachmentExtractable');
    expect(isAttachmentExtractable('audio/alert.mp3')).to.eq(true);
    expect(isAttachmentExtractable('main.js')).to.eq(true); // Webapp's entry point
    expect(isAttachmentExtractable('manifest.json')).to.eq(true);
    expect(isAttachmentExtractable('default-docs/settings.doc.json')).to.eq(true);
    expect(isAttachmentExtractable('index.html')).to.eq(true); // Webapp's entry point

    expect(isAttachmentExtractable('translations/messages-en.properties')).to.eq(false);
  });

  it('creates destination folder as necessary', () => {
    doMocking();
    fs.existsSync.returns(false);
    fs.mkdirSync = sinon.stub().returns(true);
    return resourceExtraction.run().then(() => {
      expect(fs.mkdirSync.callCount).to.eq(2);
      expect(fs.mkdirSync.args[0][0]).to.include('/extracted-resources');
      expect(fs.mkdirSync.args[1][0]).to.include('/extracted-resources/js');
    });
  });

  describe('removeDirectory()', () => {
    let isDirectoryStub;

    beforeEach(() => {
      doMocking();
      isDirectoryStub = sinon.stub().returns(false);
      fs.statSync.returns({ isDirectory: isDirectoryStub });
    });

    it('should do nothing if directory doesnt exists', () => {
      fs.existsSync.returns(false);

      resourceExtraction.removeDirectory();

      expect(fs.existsSync.callCount).to.equal(1);
      expect(fs.existsSync.args[0][0]).to.include('/extracted-resources');
      expect(fs.readdirSync.callCount).to.equal(0);
      expect(fs.unlinkSync.callCount).to.equal(0);
      expect(fs.rmdirSync.callCount).to.equal(0);
    });

    it('should remove directory if it exists and it is empty', () => {
      fs.existsSync.returns(true);
      fs.readdirSync.returns([]);

      resourceExtraction.removeDirectory();

      expect(fs.existsSync.callCount).to.equal(1);
      expect(fs.existsSync.args[0][0]).to.include('/extracted-resources');
      expect(fs.readdirSync.callCount).to.equal(1);
      expect(fs.readdirSync.args[0][0]).to.include('/extracted-resources');
      expect(fs.rmdirSync.callCount).to.equal(1);
      expect(fs.rmdirSync.args[0][0]).to.include('/extracted-resources');
      expect(fs.unlinkSync.callCount).to.equal(0);
      expect(isDirectoryStub.callCount).to.equal(0);
    });

    it('should recursively delete all files and directories', () => {
      fs.existsSync.returns(true);
      fs.readdirSync.onCall(0).returns([
        'audio',
        'index.html',
        'js',
        'main.js',
        'deep'
      ]);
      fs.readdirSync.onCall(1).returns([
        'audio.mp3'
      ]);
      fs.readdirSync.onCall(2).returns([
        'service-worker.js'
      ]);
      fs.readdirSync.onCall(3).returns([
        'deeper'
      ]);
      fs.readdirSync.onCall(4).returns([
        'any.js'
      ]);
      isDirectoryStub.onCall(0).returns(true);
      isDirectoryStub.onCall(3).returns(true);
      isDirectoryStub.onCall(6).returns(true);
      isDirectoryStub.onCall(7).returns(true);

      resourceExtraction.removeDirectory();

      expect(fs.existsSync.callCount).to.equal(5);
      expect(fs.readdirSync.callCount).to.equal(5);
      expect(fs.readdirSync.args[0][0]).to.include('/extracted-resources');
      expect(fs.readdirSync.args[1][0]).to.include('/extracted-resources/audio');
      expect(fs.readdirSync.args[2][0]).to.include('/extracted-resources/js');
      expect(fs.readdirSync.args[3][0]).to.include('/extracted-resources/deep');
      expect(fs.readdirSync.args[4][0]).to.include('/extracted-resources/deep/deeper');

      expect(fs.rmdirSync.callCount).to.equal(5);
      expect(fs.rmdirSync.args[0][0]).to.include('/extracted-resources/audio');
      expect(fs.rmdirSync.args[1][0]).to.include('/extracted-resources/js');
      expect(fs.rmdirSync.args[2][0]).to.include('/extracted-resources/deep/deeper');
      expect(fs.rmdirSync.args[3][0]).to.include('/extracted-resources/deep');
      expect(fs.rmdirSync.args[4][0]).to.include('/extracted-resources');

      expect(fs.unlinkSync.callCount).to.equal(5);
      expect(fs.unlinkSync.args[0][0]).to.include('/extracted-resources/audio/audio.mp3');
      expect(fs.unlinkSync.args[1][0]).to.include('/extracted-resources/index.html');
      expect(fs.unlinkSync.args[2][0]).to.include('/extracted-resources/js/service-worker.js');
      expect(fs.unlinkSync.args[3][0]).to.include('/extracted-resources/main.js');
      expect(fs.unlinkSync.args[4][0]).to.include('/extracted-resources/deep/deeper/any.js');
    });
  });
});
