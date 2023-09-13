const chai = require('chai');
const sinon = require('sinon');
const fs = require('fs');
const workbox = require('workbox-build');
const rewire = require('rewire');

const db = require('../../src/db');
const env = require('../../src/environment');
const logger = require('../../src/logger');
const loginController = require('../../src/controllers/login');
const extensionLibsService = require('../../src/services/extension-libs');

describe('generate service worker', () => {
  let clock;
  let getServiceWorkerHash;
  let generateServiceWorker;
  let workboxGenerate;

  beforeEach(() => {
    sinon.stub(env, 'staticPath').value('/absolute/path/to/build/static/');
    sinon.stub(env, 'webappPath').value('/absolute/path/to/build/static/webapp/');
    sinon.stub(loginController, 'renderLogin');
    sinon.stub(db.medic, 'get');
    sinon.stub(db.medic, 'put');
    sinon.stub(extensionLibsService, 'getAll');
    workboxGenerate = sinon.stub();
    clock = sinon.useFakeTimers();

    generateServiceWorker = rewire('../../src/generate-service-worker');
    getServiceWorkerHash = sinon.stub();
    getServiceWorkerHash.onCall(0).resolves('first');
    getServiceWorkerHash.onCall(1).resolves('second');
    generateServiceWorker.__set__('getServiceWorkerHash', getServiceWorkerHash);
    generateServiceWorker.__set__('apiSrcDirectoryPath', '/absolute/path/to/api/src/');
    generateServiceWorker.__set__('workbox', { generateSW: workboxGenerate });
  });

  afterEach(() => {
    clock.restore();
    sinon.restore();
  });

  it('should not generate if locked', () => {
    generateServiceWorker.run();
  });

  it('should generate the service worker file and update the service worker meta doc', async () => {
    loginController.renderLogin.resolves('loginpage html');
    extensionLibsService.getAll.resolves([{ name: 'bar.js', data: 'barcode' }]);
    sinon.stub(workbox, 'generateSW').returns();
    db.medic.get.resolves({ _id: 'service-worker-meta' });
    db.medic.put.resolves();
    clock.tick(2500);

    await generateServiceWorker.run(true);

    chai.expect(loginController.renderLogin.callCount).to.equal(1);

    chai.expect(workboxGenerate.callCount).to.deep.equal(1);
    chai.expect(workboxGenerate.args[0]).to.deep.equal([{
      swDest: '/absolute/path/to/build/static/webapp/service-worker.js',
      cacheId: 'cht',
      clientsClaim: true,
      skipWaiting: true,
      cleanupOutdatedCaches: true,
      globDirectory: '/absolute/path/to/build/static/',
      globPatterns: [
        '!webapp/service-worker.js',
        'webapp/manifest.json',
        'webapp/audio/*',
        'webapp/img/*',
        'webapp/*.js',
        'webapp/*.css',
        'webapp/fontawesome-webfont.woff2',
        'webapp/fonts/enketo-icons-v2.woff',
        'webapp/fonts/NotoSans-Bold.ttf',
        'webapp/fonts/NotoSans-Regular.ttf',
        'login/*.{css,js}',
        'login/images/*.svg',
        '/extension-libs',
        '/extension-libs/bar.js'
      ],
      templatedURLs: {
        '/': [ 'webapp/index.html' ],
        '/medic/login': 'loginpage html',
        '/medic/_design/medic/_rewrite/': [
          'webapp/appcache-upgrade.html'
        ],
        '/extension-libs': '["bar.js"]',
        '/extension-libs/bar.js': 'barcode'
      },
      ignoreURLParametersMatching: [/redirect/, /username/],
      modifyURLPrefix: {
        'webapp/': '/'
      },
      maximumFileSizeToCacheInBytes: 31457280
    }]);

    chai.expect(db.medic.get.callCount).to.equal(1);
    chai.expect(db.medic.get.args[0]).to.deep.equal(['service-worker-meta']);
    chai.expect(db.medic.put.callCount).to.equal(1);
    chai.expect(db.medic.put.args[0]).to.deep.equal([{
      _id: 'service-worker-meta',
      hash: 'second',
      generated_at: 2500,
    }]);
    chai.expect(getServiceWorkerHash.callCount).to.equal(2);
  });

  it('should not update the service worker meta doc if the service-worker file is not changed', () => {
    getServiceWorkerHash.onCall(0).resolves('same');
    getServiceWorkerHash.onCall(1).resolves('same');
    extensionLibsService.getAll.resolves([]);

    return generateServiceWorker.run(true).then(() => {
      chai.expect(loginController.renderLogin.callCount).to.equal(1);
      chai.expect(workboxGenerate.callCount).to.deep.equal(1);
      chai.expect(db.medic.get.callCount).to.equal(0);
      chai.expect(db.medic.put.callCount).to.equal(0);
    });
  });

  it('should update the meta doc if the request to hash the old service worker file contents fails', () => {
    getServiceWorkerHash.onCall(0).resolves(undefined);
    getServiceWorkerHash.onCall(1).resolves('same');
    extensionLibsService.getAll.resolves([]);
    db.medic.get.resolves({ _id: 'service-worker-meta' });
    db.medic.put.resolves();

    return generateServiceWorker.run(true).then(() => {
      chai.expect(loginController.renderLogin.callCount).to.equal(1);
      chai.expect(workboxGenerate.callCount).to.deep.equal(1);
      chai.expect(db.medic.get.callCount).to.equal(1);
      chai.expect(db.medic.put.callCount).to.equal(1);
      chai.expect(db.medic.put.args[0]).to.deep.equal([{
        _id: 'service-worker-meta',
        hash: 'same',
        generated_at: 0,
      }]);
    });
  });

  it('should not update the meta doc if the request to hash the new service worker file fails', () => {
    getServiceWorkerHash.onCall(0).resolves('thing');
    getServiceWorkerHash.onCall(1).resolves(undefined);
    extensionLibsService.getAll.resolves([]);
    db.medic.get.resolves({ _id: 'service-worker-meta' });
    db.medic.put.resolves();

    return generateServiceWorker.run(true).then(() => {
      chai.expect(loginController.renderLogin.callCount).to.equal(1);
      chai.expect(workboxGenerate.callCount).to.deep.equal(1);
      chai.expect(db.medic.get.callCount).to.equal(0);
      chai.expect(db.medic.put.callCount).to.equal(0);
    });
  });

  it('should not update the meta doc if hashing both old and new service worker files fail', () => {
    getServiceWorkerHash.onCall(0).resolves(undefined);
    getServiceWorkerHash.onCall(1).resolves(undefined);
    extensionLibsService.getAll.resolves([]);
    db.medic.get.resolves({ _id: 'service-worker-meta' });
    db.medic.put.resolves();

    return generateServiceWorker.run(true).then(() => {
      chai.expect(loginController.renderLogin.callCount).to.equal(1);
      chai.expect(workboxGenerate.callCount).to.deep.equal(1);
      chai.expect(db.medic.get.callCount).to.equal(0);
      chai.expect(db.medic.put.callCount).to.equal(0);
    });
  });

  it('should throw error when generating the service worker fails', () => {
    loginController.renderLogin.resolves('aaa');
    extensionLibsService.getAll.resolves([]);
    workboxGenerate.rejects({ an: 'error' });

    return generateServiceWorker
      .run(true)
      .then(() => chai.expect.fail('should have thrown'))
      .catch(err => {
        chai.expect(err).to.deep.equal({ an: 'error' });
        chai.expect(workboxGenerate.callCount).to.equal(1);
        chai.expect(db.medic.get.callCount).to.equal(0);
        chai.expect(db.medic.put.callCount).to.equal(0);
      });
  });

  it('should handle sw doc get 404s', () => {
    db.medic.get.rejects({ status: 404 });
    db.medic.put.resolves();
    extensionLibsService.getAll.resolves([]);
    sinon.stub(logger, 'error');
    loginController.renderLogin.resolves('aaa');
    workboxGenerate.resolves();

    return generateServiceWorker.run(true).then(() => {
      chai.expect(logger.error.callCount).to.equal(0);
      chai.expect(db.medic.get.callCount).to.equal(1);
      chai.expect(db.medic.put.callCount).to.equal(1);
      chai.expect(db.medic.put.args[0]).to.deep.equal([{
        _id: 'service-worker-meta',
        generated_at: 0,
        hash: 'second',
      }]);
    });
  });

  it('should handle sw doc put 409s', () => {
    db.medic.get.resolves({ _id: 'service-worker-meta' });
    db.medic.put.rejects({ status: 409 });
    extensionLibsService.getAll.resolves([]);
    loginController.renderLogin.resolves('aaa');
    workboxGenerate.resolves();

    return generateServiceWorker.run(true).then(() => {
      chai.expect(db.medic.get.callCount).to.equal(1);
      chai.expect(db.medic.put.callCount).to.equal(1);
    });
  });

  it('should log other db get errors', () => {
    db.medic.get.rejects({ status: 500 });
    loginController.renderLogin.resolves('aaa');
    extensionLibsService.getAll.resolves([]);
    workboxGenerate.resolves();
    sinon.stub(logger, 'error');

    return generateServiceWorker.run(true).then(() => {
      chai.expect(logger.error.args[0][1]).to.deep.equal({ status: 500 });
      chai.expect(db.medic.put.callCount).to.equal(0);
    });
  });

  it('should log other db put errors', () => {
    db.medic.get.resolves({});
    db.medic.put.rejects({ status: 502 });
    loginController.renderLogin.resolves('aaa');
    extensionLibsService.getAll.resolves([]);
    workboxGenerate.resolves();
    sinon.stub(logger, 'error');

    return generateServiceWorker.run(true).then(() => {
      chai.expect(logger.error.args[0][1]).to.deep.equal({ status: 502 });
    });
  });

  describe('getServiceWorkerHash', () => {
    let listeners;
    let stream;
    beforeEach(() => {
      generateServiceWorker = rewire('../../src/generate-service-worker');
      getServiceWorkerHash = generateServiceWorker.__get__('getServiceWorkerHash');

      sinon.stub(fs, 'access');
      sinon.stub(fs, 'createReadStream');

      listeners = {};
      stream = {
        setEncoding: sinon.stub(),
        on: sinon.stub().callsFake((eventName, callback) => {
          listeners[eventName] = callback;
          return stream;
        }),
      };
    });

    it('should return undefined if the file is not found', () => {
      fs.access.callsArgWith(1, { error: true });

      return getServiceWorkerHash().then((result) => {
        chai.expect(result).to.equal(undefined);
        chai.expect(fs.access.callCount).to.equal(1);
        chai.expect(fs.access.args[0][0]).to.equal('/absolute/path/to/build/static/webapp/service-worker.js');
        chai.expect(fs.createReadStream.callCount).to.equal(0);
      });
    });

    it('should return the sha1 hash of the current service-worker file', () => {
      fs.access.callsArgWith(1, undefined);
      fs.createReadStream.returns(stream);

      const getHash = getServiceWorkerHash();

      return Promise
        .resolve()
        .then(() => {
          chai.expect(fs.createReadStream.callCount).to.equal(1);
          chai.expect(fs.createReadStream.args[0]).to.deep.equal([
            '/absolute/path/to/build/static/webapp/service-worker.js',
          ]);
          chai.expect(stream.setEncoding.callCount).to.equal(1);
          chai.expect(stream.setEncoding.args[0]).to.deep.equal(['utf8']);

          chai.expect(Object.keys(listeners)).to.deep.equal(['data', 'end', 'error']);
          chai.expect(listeners.data).to.be.a('function');
          chai.expect(listeners.end).to.be.a('function');
          chai.expect(listeners.error).to.be.a('function');

          listeners.data('0');
          listeners.data('1');
          listeners.data('2');
          listeners.end();

          return getHash;
        })
        .then(hash => {
          chai.expect(hash).to.equal('c4a2d99bc28d236098a095277b7eb0718d6be068');
        });
    });

    it('should return undefined on stream read error', () => {
      fs.access.callsArgWith(1, undefined);
      fs.createReadStream.returns(stream);

      const getHash = getServiceWorkerHash();

      return Promise
        .resolve()
        .then(() => {
          chai.expect(fs.createReadStream.callCount).to.equal(1);
          chai.expect(fs.createReadStream.args[0]).to.deep.equal([
            '/absolute/path/to/build/static/webapp/service-worker.js',
          ]);
          chai.expect(stream.setEncoding.callCount).to.equal(1);
          chai.expect(stream.setEncoding.args[0]).to.deep.equal(['utf8']);

          chai.expect(Object.keys(listeners)).to.deep.equal(['data', 'end', 'error']);
          chai.expect(listeners.data).to.be.a('function');
          chai.expect(listeners.end).to.be.a('function');
          chai.expect(listeners.error).to.be.a('function');

          listeners.data('0');
          listeners.data('1');
          listeners.data('2');
          listeners.error({ some: 'error' });
          listeners.end();

          return getHash;
        })
        .then(hash => {
          chai.expect(hash).to.equal(undefined);
        });
    });

    it('should return undefined when other error happens', () => {
      fs.access.callsArgWith(1, false);
      fs.createReadStream.returns(stream);
      stream.setEncoding.throws(new Error('boom'));

      const getHash = getServiceWorkerHash();
      return getHash.then(hash => {
        chai.expect(hash).to.equal(undefined);
      });
    });
  });
});
