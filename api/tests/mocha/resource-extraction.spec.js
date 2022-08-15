const rewire = require('rewire');
const resourceExtraction = rewire('../../src/resource-extraction');
const sinon = require('sinon');
const { expect } = require('chai'); // jshint ignore:line

let fakeDdoc;
let mockFs;
let mockDb;

resourceExtraction.__set__('logger', { debug: () => {} });

const doMocking = (overwrites = {}) => {
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
    unlinkSync: sinon.stub(),
    rmdirSync: sinon.stub(),
    readdirSync: sinon.stub().returns([]),
    statSync: sinon.stub()
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
};

describe('Resource Extraction', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('attachments written to disk', () => {
    const expected = { content: { toString: () => 'foo' } };
    doMocking(expected);
    return resourceExtraction.run().then(() => {
      expect(mockFs.writeFile.callCount).to.eq(1);

      const [actualOutputPath, actualContent] = mockFs.writeFile.args[0];
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
        expect(mockFs.writeFile.callCount).to.eq(1);

        const [actualOutputPath, actualContent] = mockFs.writeFile.args[0];
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
        expect(mockFs.writeFile.callCount).to.eq(2);

        const [actualOutputPath, actualContent] = mockFs.writeFile.args[1];
        expect(actualOutputPath).to.include('/extracted-resources/js/attached.js');
        expect(actualContent).to.include(expected.content);
      });
  });

  it('non-cacheable attachments not written to disk', () => {
    doMocking({ attachments: { 'skip/me.js': {} }});
    return resourceExtraction.run().then(() => {
      expect(mockFs.writeFile.callCount).to.eq(0);
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
    mockFs.existsSync.returns(false);
    mockFs.mkdirSync = sinon.stub().returns(true);
    return resourceExtraction.run().then(() => {
      expect(mockFs.mkdirSync.callCount).to.eq(2);
      expect(mockFs.mkdirSync.args[0][0]).to.include('/extracted-resources');
      expect(mockFs.mkdirSync.args[1][0]).to.include('/extracted-resources/js');
    });
  });

  describe('removeDirectory()', () => {
    let isDirectoryStub;

    beforeEach(() => {
      doMocking();
      isDirectoryStub = sinon.stub().returns(false);
      mockFs.statSync.returns({ isDirectory: isDirectoryStub });
    });

    it('should do nothing if directory doesnt exists', () => {
      mockFs.existsSync.returns(false);

      resourceExtraction.removeDirectory();

      expect(mockFs.existsSync.callCount).to.equal(1);
      expect(mockFs.existsSync.args[0][0]).to.include('/extracted-resources');
      expect(mockFs.readdirSync.callCount).to.equal(0);
      expect(mockFs.unlinkSync.callCount).to.equal(0);
      expect(mockFs.rmdirSync.callCount).to.equal(0);
    });

    it('should remove directory if it exists and it is empty', () => {
      mockFs.existsSync.returns(true);
      mockFs.readdirSync.returns([]);

      resourceExtraction.removeDirectory();

      expect(mockFs.existsSync.callCount).to.equal(1);
      expect(mockFs.existsSync.args[0][0]).to.include('/extracted-resources');
      expect(mockFs.readdirSync.callCount).to.equal(1);
      expect(mockFs.readdirSync.args[0][0]).to.include('/extracted-resources');
      expect(mockFs.rmdirSync.callCount).to.equal(1);
      expect(mockFs.rmdirSync.args[0][0]).to.include('/extracted-resources');
      expect(mockFs.unlinkSync.callCount).to.equal(0);
      expect(isDirectoryStub.callCount).to.equal(0);
    });

    it('should recursively delete all files and directories', () => {
      mockFs.existsSync.returns(true);
      mockFs.readdirSync.onCall(0).returns([
        'audio',
        'index.html',
        'js',
        'main.js',
        'deep'
      ]);
      mockFs.readdirSync.onCall(1).returns([
        'audio.mp3'
      ]);
      mockFs.readdirSync.onCall(2).returns([
        'service-worker.js'
      ]);
      mockFs.readdirSync.onCall(3).returns([
        'deeper'
      ]);
      mockFs.readdirSync.onCall(4).returns([
        'any.js'
      ]);
      isDirectoryStub.onCall(0).returns(true);
      isDirectoryStub.onCall(3).returns(true);
      isDirectoryStub.onCall(6).returns(true);
      isDirectoryStub.onCall(7).returns(true);

      resourceExtraction.removeDirectory();

      expect(mockFs.existsSync.callCount).to.equal(5);
      expect(mockFs.readdirSync.callCount).to.equal(5);
      expect(mockFs.readdirSync.args[0][0]).to.include('/extracted-resources');
      expect(mockFs.readdirSync.args[1][0]).to.include('/extracted-resources/audio');
      expect(mockFs.readdirSync.args[2][0]).to.include('/extracted-resources/js');
      expect(mockFs.readdirSync.args[3][0]).to.include('/extracted-resources/deep');
      expect(mockFs.readdirSync.args[4][0]).to.include('/extracted-resources/deep/deeper');

      expect(mockFs.rmdirSync.callCount).to.equal(5);
      expect(mockFs.rmdirSync.args[0][0]).to.include('/extracted-resources/audio');
      expect(mockFs.rmdirSync.args[1][0]).to.include('/extracted-resources/js');
      expect(mockFs.rmdirSync.args[2][0]).to.include('/extracted-resources/deep/deeper');
      expect(mockFs.rmdirSync.args[3][0]).to.include('/extracted-resources/deep');
      expect(mockFs.rmdirSync.args[4][0]).to.include('/extracted-resources');

      expect(mockFs.unlinkSync.callCount).to.equal(5);
      expect(mockFs.unlinkSync.args[0][0]).to.include('/extracted-resources/audio/audio.mp3');
      expect(mockFs.unlinkSync.args[1][0]).to.include('/extracted-resources/index.html');
      expect(mockFs.unlinkSync.args[2][0]).to.include('/extracted-resources/js/service-worker.js');
      expect(mockFs.unlinkSync.args[3][0]).to.include('/extracted-resources/main.js');
      expect(mockFs.unlinkSync.args[4][0]).to.include('/extracted-resources/deep/deeper/any.js');
    });
  });
});
