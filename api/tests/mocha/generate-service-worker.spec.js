const chai = require('chai');
const sinon = require('sinon');
const path = require('path');
const swPrecache = require('sw-precache');

const generateServiceWorker = require('../../src/generate-service-worker');
const db = require('../../src/db');
const env = require('../../src/environment');
const loginController = require('../../src/controllers/login');

describe('generate service worker', () => {
  let clock;
  beforeEach(() => {
    sinon.stub(env, 'getExtractedResourcesPath').returns('');
    sinon.stub(loginController, 'renderLogin');
    sinon.stub(swPrecache, 'write');
    sinon.stub(db.medic, 'get');
    sinon.stub(db.medic, 'put');
    clock = sinon.useFakeTimers();
  });

  afterEach(() => {
    clock.restore();
    sinon.restore();
  });

  it('should generate the service worker file and update the service worker doc', () => {
    env.getExtractedResourcesPath.returns('/tmp/');
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
        generated_at: 2500,
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
    loginController.renderLogin.resolves('aaa');
    swPrecache.write.resolves();

    return generateServiceWorker.run().then(() => {
      chai.expect(db.medic.get.callCount).to.equal(1);
      chai.expect(db.medic.put.callCount).to.equal(1);
      chai.expect(db.medic.put.args[0]).to.deep.equal([{
        _id: 'service-worker-meta',
        generated_at: 0,
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
});
