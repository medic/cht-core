const rewire = require('rewire');
const sinon = require('sinon');
const { expect } = require('chai'); // jshint ignore:line
const db = require('../../src/db');
const fs = require('fs');

let resourceExtraction;
let medicDdoc;
let adminDdoc;

const doMocking = (overwrites = {}) => {
  resourceExtraction = rewire('../../src/resource-extraction');
  resourceExtraction.__set__('logger', { debug: sinon.stub() });

  const defaultAttachment = {
    'js/attached.js': { digest: 'current' },
  };
  const defaultAdminAttachment = {
    'main.js': { digest: 'this' },
  };

  medicDdoc = {
    _id: '_design/medic',
    _attachments: overwrites.attachments || defaultAttachment,
  };
  adminDdoc = {
    _id: '_design/medic-admin',
    _attachments: overwrites.adminAttachments || defaultAdminAttachment,
  };

  sinon.stub(db.medic, 'get');
  db.medic.get.withArgs('_design/medic').resolves(medicDdoc);
  db.medic.get.withArgs('_design/medic-admin').resolves(adminDdoc);
  sinon.stub(db.medic, 'getAttachment');
  db.medic.getAttachment.withArgs('_design/medic').resolves(overwrites.content);
  db.medic.getAttachment.withArgs('_design/medic-admin').resolves(overwrites.adminContent);
  sinon.stub(fs, 'existsSync').returns(true);
  sinon.stub(fs, 'writeFile').callsArg(2);
  sinon.stub(fs, 'unlinkSync');
  sinon.stub(fs, 'rmdirSync');
  sinon.stub(fs, 'readdirSync').returns([]);
  sinon.stub(fs, 'statSync');
};

const expectWrite = (args, pathLike, content) => {
  expect(args[0]).to.include(pathLike);
  expect(args[1]).to.equal(content);
};

describe('Resource Extraction', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('attachments written to disk', () => {
    const expected = {
      content: { toString: sinon.stub().returns('foo') },
      adminContent: { toString: sinon.stub().returns('bar') },
    };
    doMocking(expected);
    return resourceExtraction.run().then(() => {
      expect(db.medic.get.args).to.deep.equal([
        ['_design/medic'],
        ['_design/medic-admin'],
      ]);
      expect(db.medic.getAttachment.args).to.deep.equal([
        ['_design/medic', 'js/attached.js'],
        ['_design/medic-admin', 'main.js'],
      ]);

      expect(fs.writeFile.callCount).to.eq(2);
      expectWrite(fs.writeFile.args[0], '/extracted-resources/js/attached.js', expected.content);
      expectWrite(fs.writeFile.args[1], '/extracted-resources/admin/main.js', expected.adminContent);
    });
  });

  it('should work with multiple attachments', () => {
    const mocks = {
      attachments: {
        'js/one.js': { digest: '2' },
        'css/two.css': { digest: '2' },
        'js/skipped': { digest: 1 },
      },
      adminAttachments: {
        'main.js': { digest: '1' },
        'main.css': { digest: '1' },
      },
      content: 'medic',
      adminContent: 'admin',
    };
    doMocking(mocks);

    return resourceExtraction.run().then(() => {
      expect(db.medic.get.args).to.deep.equal([
        ['_design/medic'],
        ['_design/medic-admin'],
      ]);

      expect(db.medic.getAttachment.args).to.deep.equal([
        ['_design/medic', 'js/one.js'],
        ['_design/medic', 'css/two.css'],
        ['_design/medic-admin', 'main.js'],
        ['_design/medic-admin', 'main.css'],
      ]);

      expect(fs.writeFile.callCount).to.eq(4);
      expectWrite(fs.writeFile.args[0], '/extracted-resources/js/one.js', mocks.content);
      expectWrite(fs.writeFile.args[1], '/extracted-resources/css/two.css', mocks.content);
      expectWrite(fs.writeFile.args[2], '/extracted-resources/admin/main.js', mocks.adminContent);
      expectWrite(fs.writeFile.args[3], '/extracted-resources/admin/main.css', mocks.adminContent);
    });
  });

  it('unchanged files get written once', () => {
    const expected = { content: 'foo', adminContent: 'bar' };
    doMocking(expected);
    return resourceExtraction.run()
      .then(resourceExtraction.run)
      .then(() => {
        expect(fs.writeFile.callCount).to.eq(2);

        let [actualOutputPath, actualContent] = fs.writeFile.args[0];
        expect(actualOutputPath).to.include('/extracted-resources/js/attached.js');
        expect(actualContent).to.include(expected.content);

        [actualOutputPath, actualContent] = fs.writeFile.args[1];
        expect(actualOutputPath).to.include('/extracted-resources/admin/main.js');
        expect(actualContent).to.include(expected.adminContent);
      });
  });

  it('changed files get written again', () => {
    const expected = { content: 'foo', adminContent: 'baz' };
    doMocking(expected);
    return resourceExtraction.run()
      .then(() => {
        medicDdoc._attachments['js/attached.js'].digest = 'update';
        adminDdoc._attachments['main.js'].digest = 'new';
        return resourceExtraction.run();
      })
      .then(() => {
        expect(fs.writeFile.callCount).to.eq(4);

        let [actualOutputPath, actualContent] = fs.writeFile.args[2];
        expect(actualOutputPath).to.include('/extracted-resources/js/attached.js');
        expect(actualContent).to.include(expected.content);

        [actualOutputPath, actualContent] = fs.writeFile.args[3];
        expect(actualOutputPath).to.include('/extracted-resources/admin/main.js');
        expect(actualContent).to.include(expected.adminContent);
      });
  });

  it('non-cacheable attachments not written to disk', () => {
    doMocking({ attachments: { 'skip/me.js': {} }, adminAttachments: { }});
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
      expect(fs.mkdirSync.callCount).to.eq(4);
      expect(fs.mkdirSync.args[0][0]).to.include('/extracted-resources');
      expect(fs.mkdirSync.args[1][0]).to.include('/extracted-resources/js');
      expect(fs.mkdirSync.args[2][0]).to.include('/extracted-resources/admin');
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

  describe('extractMedic', () => {
    it('should only extract medic ddoc', () => {
      const expected = {
        content: { toString: sinon.stub().returns('foo') },
        adminContent: { toString: sinon.stub().returns('bar') },
      };
      doMocking(expected);
      return resourceExtraction.extractMedic().then(() => {
        expect(db.medic.get.args).to.deep.equal([ ['_design/medic'] ]);
        expect(db.medic.getAttachment.args).to.deep.equal([ ['_design/medic', 'js/attached.js'] ]);

        expect(fs.writeFile.callCount).to.eq(1);
        expectWrite(fs.writeFile.args[0], '/extracted-resources/js/attached.js', expected.content);
      });
    });
  });

  describe('extractAdmin', () => {
    it('should only extract admin ddoc', () => {
      const expected = {
        content: { toString: sinon.stub().returns('foo') },
        adminContent: { toString: sinon.stub().returns('bar') },
      };
      doMocking(expected);
      return resourceExtraction.extractAdmin().then(() => {
        expect(db.medic.get.args).to.deep.equal([ ['_design/medic-admin'] ]);
        expect(db.medic.getAttachment.args).to.deep.equal([ ['_design/medic-admin', 'main.js'], ]);

        expect(fs.writeFile.callCount).to.eq(1);
        expectWrite(fs.writeFile.args[0], '/extracted-resources/admin/main.js', expected.adminContent);
      });
    });
  });
});
