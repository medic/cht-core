const chai = require('chai');
const sinon = require('sinon');
const path = require('path');
const fs = require('fs');
const swPrecache = require('sw-precache');
const rewire = require('rewire');

const db = require('../../src/db');
const env = require('../../src/environment');
const loginController = require('../../src/controllers/login');

describe('generate service worker', () => {
  let clock;
  let getServiceWorkerHash;
  let generateServiceWorker;

  beforeEach(() => {
    sinon.stub(env, 'getExtractedResourcesPath').returns('/tmp/');
    sinon.stub(loginController, 'renderLogin');
    sinon.stub(swPrecache, 'write');
    sinon.stub(db.medic, 'get');
    sinon.stub(db.medic, 'put');
    clock = sinon.useFakeTimers();

    generateServiceWorker = rewire('../../src/generate-service-worker');
    getServiceWorkerHash = sinon.stub();
    getServiceWorkerHash.onCall(0).resolves('first');
    getServiceWorkerHash.onCall(1).resolves('second');
    generateServiceWorker.__set__('getServiceWorkerHash', getServiceWorkerHash);
  });

  afterEach(() => {
    clock.restore();
    sinon.restore();
  });

  it('should generate the service worker file and update the service worker doc', () => {
    loginController.renderLogin.resolves('loginpage html');
    swPrecache.write.resolves();
    db.medic.get.resolves({ _id: 'service-worker-meta' });
    db.medic.put.resolves();
    const apiPath = path.join(__dirname, '../../src');
    clock.tick(2500);

    return generateServiceWorker.run().then(() => {
      chai.expect(loginController.renderLogin.callCount).to.equal(1);

      chai.expect(swPrecache.write.callCount).to.deep.equal(1);
      chai.expect(swPrecache.write.args[0]).to.deep.equal([
        '/tmp/js/service-worker.js',
        {
          cacheId: 'cache',
          claimsClient: true,
          skipWaiting: true,
          directoryIndex: false,
          handleFetch: true,
          staticFileGlobs: [
            '/tmp/{audio,img}/*',
            '/tmp/manifest.json',
            '/tmp/*.js',
            '/tmp/*.css',
            '/tmp/fontawesome-webfont.woff2',
            '/tmp/fonts/enketo-icons-v2.woff',
            '/tmp/fonts/NotoSans-Bold.ttf',
            '/tmp/fonts/NotoSans-Regular.ttf',
            path.join(apiPath, 'public/login/*.{css,js}'),
          ],
          dynamicUrlToDependencies: {
            '/': ['/tmp/index.html'], // Webapp's entry point
            '/medic/login': 'loginpage html',
            '/medic/_design/medic/_rewrite/': [path.join(apiPath, 'public/appcache-upgrade.html')],
          },
          ignoreUrlParametersMatching: [/redirect/, /username/],
          stripPrefixMulti: {
            ['/tmp/']: '',
            [path.join(apiPath, 'public')]: '',
          },
          maximumFileSizeToCacheInBytes: 1048576 * 30,
          verbose: true,
        },
      ]);

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
  });

  it('should not update the meta doc if the service worker has no changes', () => {
    getServiceWorkerHash.onCall(0).resolves('same');
    getServiceWorkerHash.onCall(1).resolves('same');

    return generateServiceWorker.run().then(() => {
      chai.expect(loginController.renderLogin.callCount).to.equal(1);
      chai.expect(swPrecache.write.callCount).to.deep.equal(1);
      chai.expect(db.medic.get.callCount).to.equal(0);
      chai.expect(db.medic.put.callCount).to.equal(0);
    });
  });

  it('should update the meta doc if initial request to hash fails', () => {
    getServiceWorkerHash.onCall(0).resolves(undefined);
    getServiceWorkerHash.onCall(1).resolves('same');
    db.medic.get.resolves({ _id: 'service-worker-meta' });
    db.medic.put.resolves();

    return generateServiceWorker.run().then(() => {
      chai.expect(loginController.renderLogin.callCount).to.equal(1);
      chai.expect(swPrecache.write.callCount).to.deep.equal(1);
      chai.expect(db.medic.get.callCount).to.equal(1);
      chai.expect(db.medic.put.callCount).to.equal(1);
      chai.expect(db.medic.put.args[0]).to.deep.equal([{
        _id: 'service-worker-meta',
        hash: 'same',
        generated_at: 0,
      }]);
    });
  });

  it('should update the meta doc if updated request to hash fails', () => {
    getServiceWorkerHash.onCall(0).resolves('thing');
    getServiceWorkerHash.onCall(1).resolves(undefined);
    db.medic.get.resolves({ _id: 'service-worker-meta' });
    db.medic.put.resolves();

    return generateServiceWorker.run().then(() => {
      chai.expect(loginController.renderLogin.callCount).to.equal(1);
      chai.expect(swPrecache.write.callCount).to.deep.equal(1);
      chai.expect(db.medic.get.callCount).to.equal(1);
      chai.expect(db.medic.put.callCount).to.equal(1);
      chai.expect(db.medic.put.args[0]).to.deep.equal([{
        _id: 'service-worker-meta',
        hash: undefined,
        generated_at: 0,
      }]);
    });
  });

  it('should update the meta doc if both requests to hash fail', () => {
    getServiceWorkerHash.onCall(0).resolves(undefined);
    getServiceWorkerHash.onCall(1).resolves(undefined);
    db.medic.get.resolves({ _id: 'service-worker-meta' });
    db.medic.put.resolves();

    return generateServiceWorker.run().then(() => {
      chai.expect(loginController.renderLogin.callCount).to.equal(1);
      chai.expect(swPrecache.write.callCount).to.deep.equal(1);
      chai.expect(db.medic.get.callCount).to.equal(1);
      chai.expect(db.medic.put.callCount).to.equal(1);
      chai.expect(db.medic.put.args[0]).to.deep.equal([{
        _id: 'service-worker-meta',
        hash: undefined,
        generated_at: 0,
      }]);
    });
  });

  it('should throw an error when rendering the login page fails', () => {
    loginController.renderLogin.rejects({ some: 'error' });
    return generateServiceWorker
      .run()
      .then(() => chai.expect.fail('should have thrown'))
      .catch(err => {
        chai.expect(err).to.deep.equal({ some: 'error' });
        chai.expect(swPrecache.write.callCount).to.equal(0);
        chai.expect(db.medic.get.callCount).to.equal(0);
        chai.expect(db.medic.put.callCount).to.equal(0);
      });
  });

  it('should throw error when generating the service worker fails', () => {
    loginController.renderLogin.resolves('aaa');
    swPrecache.write.rejects({ an: 'error' });

    return generateServiceWorker
      .run()
      .then(() => chai.expect.fail('should have thrown'))
      .catch(err => {
        chai.expect(err).to.deep.equal({ an: 'error' });
        chai.expect(swPrecache.write.callCount).to.equal(1);
        chai.expect(db.medic.get.callCount).to.equal(0);
        chai.expect(db.medic.put.callCount).to.equal(0);
      });
  });

  it('should handle sw doc get 404s', () => {
    db.medic.get.rejects({ status: 404 });
    db.medic.put.resolves();
    loginController.renderLogin.resolves('aaa');
    swPrecache.write.resolves();

    return generateServiceWorker.run().then(() => {
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
    loginController.renderLogin.resolves('aaa');
    swPrecache.write.resolves();

    return generateServiceWorker.run().then(() => {
      chai.expect(db.medic.get.callCount).to.equal(1);
      chai.expect(db.medic.put.callCount).to.equal(1);
    });
  });

  it('should throw other db get errors', () => {
    db.medic.get.rejects({ status: 500 });
    loginController.renderLogin.resolves('aaa');
    swPrecache.write.resolves();

    return generateServiceWorker
      .run()
      .then(() => chai.expect.fail('should have thrown'))
      .catch(err => {
        chai.expect(err).to.deep.equal({ status: 500 });
        chai.expect(db.medic.put.callCount).to.equal(0);
      });
  });

  it('should throw other db put errors', () => {
    db.medic.get.resolves({});
    db.medic.put.rejects({ status: 502 });
    loginController.renderLogin.resolves('aaa');
    swPrecache.write.resolves();

    return generateServiceWorker
      .run()
      .then(() => chai.expect.fail('should have thrown'))
      .catch(err => {
        chai.expect(err).to.deep.equal({ status: 502 });
      });
  });

  describe('getServiceWorkerHash', () => {
    let listeners;
    let stream;
    beforeEach(() => {
      generateServiceWorker = rewire('../../src/generate-service-worker');
      getServiceWorkerHash = generateServiceWorker.__get__('getServiceWorkerHash');

      sinon.stub(fs, 'existsSync');
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
      fs.existsSync.returns(false);

      return getServiceWorkerHash().then((result) => {
        chai.expect(result).to.equal(undefined);
        chai.expect(fs.existsSync.callCount).to.equal(1);
        chai.expect(fs.existsSync.args[0]).to.deep.equal(['/tmp/js/service-worker.js']);
        chai.expect(fs.createReadStream.callCount).to.equal(0);
      });
    });

    it('should return the sha1 hash of the current service-worker file', () => {
      fs.existsSync.returns(true);
      fs.createReadStream.returns(stream);

      const getHash = getServiceWorkerHash();

      chai.expect(fs.createReadStream.callCount).to.equal(1);
      chai.expect(fs.createReadStream.args[0]).to.deep.equal(['/tmp/js/service-worker.js']);
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

      return getHash.then(hash => {
        chai.expect(hash).to.equal('c4a2d99bc28d236098a095277b7eb0718d6be068');
      });
    });

    it('should return undefined on stream read error', () => {
      fs.existsSync.returns(true);
      fs.createReadStream.returns(stream);

      const getHash = getServiceWorkerHash();

      chai.expect(fs.createReadStream.callCount).to.equal(1);
      chai.expect(fs.createReadStream.args[0]).to.deep.equal(['/tmp/js/service-worker.js']);
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

      return getHash.then(hash => {
        chai.expect(hash).to.equal(undefined);
      });
    });

    it('should return undefined when other error happens', () => {
      fs.existsSync.returns(true);
      fs.createReadStream.returns(stream);
      stream.setEncoding.throws(new Error('boom'));

      const getHash = getServiceWorkerHash();
      return getHash.then(hash => {
        chai.expect(hash).to.equal(undefined);
      });
    });
  });
});
