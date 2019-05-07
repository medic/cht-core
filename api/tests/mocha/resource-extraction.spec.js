const rewire = require('rewire'),
      resourceExtraction = rewire('../../src/resource-extraction'),
      sinon = require('sinon'),
      { expect } = require('chai'); // jshint ignore:line

let fakeDdoc, mockFs, mockDb;
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
  describe('getDestinationDirectory', () => {
    const testScenario = (env, expected) => resourceExtraction.__with__({
      env,
      __dirname: '/__dirname',
    })(() => {
      const actual = resourceExtraction.getDestinationDirectory();
      expect(actual).to.eq(expected);
    });

    it('default', () => testScenario({}, '/__dirname/extracted-resources'));
    it('explicit via env', () => testScenario({ MEDIC_API_RESOURCE_PATH: '/foo' }, '/foo'));
    it('default in production', () => testScenario({ NODE_ENV: 'production' }, '/tmp/extracted-resources'));
    it('explit and production', () => testScenario({ MEDIC_API_RESOURCE_PATH: '/foo', NODE_ENV: 'production' }, '/foo'));
  });

  it('attachments written to disk', done => {
    const expected = { content: { toString: () => 'foo' } };
    doMocking(expected);
    resourceExtraction.run().then(() => {
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
    resourceExtraction.run()
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
    resourceExtraction.run()
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
      expect(mockFs.mkdirSync.args[0][0]).to.include('src/extracted-resources');
      expect(mockFs.mkdirSync.args[1][0]).to.include('src/extracted-resources/js');
      done();
    });
  });
});
