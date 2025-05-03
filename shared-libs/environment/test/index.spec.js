const chai = require('chai');
const { expect } = chai;
chai.use(require('chai-exclude'));
const sinon = require('sinon');
const rewire = require('rewire');
const logger = require('@medic/logger');
const request = require('@medic/couch-request');

let originalEnv;
const stubProcessEnv = (props) => {
  originalEnv = { ...process.env };
  process.env = { ...process.env, ...props };
};

describe('environment', () => {
  afterEach(() => {
    sinon.restore();
    process.env = originalEnv;
  });

  it('should exit if no couchurl', async () => {
    sinon.stub(process, 'exit');
    stubProcessEnv({ COUCH_URL: '' });
    sinon.stub(logger, 'error');
    rewire('../src/index');
    expect(process.exit.calledWith(1)).to.be.true;
    expect(logger.error.calledWithMatch('Please define a valid COUCH_URL in your environment')).to.be.true;
  });

  it('should exit if the URL is invalid', () => {
    sinon.stub(process, 'exit');
    stubProcessEnv({ COUCH_URL: 'not a url' });
    sinon.stub(logger, 'error');
    rewire('../src/index');
    expect(process.exit.calledWith(1)).to.be.true;
    expect(logger.error.calledWithMatch('Please define a valid COUCH_URL in your environment')).to.be.true;
  });

  it('should export correct values', () => {
    stubProcessEnv({ COUCH_URL: 'https://admin:pass@couchdb:5984/medicdb' });

    const env = rewire('../src/index');

    expect(env).excluding(['getDeployInfo', 'getVersion']).to.deep.equal({
      couchUrl: 'https://admin:pass@couchdb:5984/medicdb',
      buildsUrl: 'https://staging.dev.medicmobile.org/_couch/builds_4',
      serverUrl: 'https://admin:pass@couchdb:5984/',
      serverUrlNoAuth: 'https://couchdb:5984/',
      protocol: 'https:',
      port: '5984',
      host: 'couchdb',
      db: 'medicdb',
      ddoc: 'medic',
      username: 'admin',
      password: 'pass',
      proxies: {
        changeOrigin: false,
      },
      isTesting: false
    });

    expect(env.getDeployInfo).to.be.a('function');
    expect(env.getVersion).to.be.a('function');
  });

  it('should export custom builds url, proxies changes and testing', () => {
    stubProcessEnv({
      COUCH_URL: 'https://admin:pass@couchdb:5984/medic-test',
      BUILDS_URL: 'https://google.com',
      PROXY_CHANGE_ORIGIN: 'true'
    });

    const env = rewire('../src/index');

    expect(env).to.deep.include({
      buildsUrl: 'https://google.com',
      isTesting: true,
      proxies: {
        changeOrigin: true
      }
    });
  });

  describe('deploy info', () => {
    beforeEach(() => {
      stubProcessEnv({ COUCH_URL: 'http://admin:pass@localhost:5984/medicdb' });
    });

    afterEach(() => {
      sinon.restore();
      process.env = originalEnv;
    });

    describe('getDeployInfo', () => {
      it('should return deploy info with version from build_info', async () => {
        const ddoc = {
          _id: '_design/medic',
          build_info: {
            version: '4.1.0',
            date: '2023-01-01',
            base_version: '4.0.0'
          },
          deploy_info: {
            timestamp: '2023-01-02'
          }
        };

        sinon.stub(request, 'get').resolves(ddoc);
        const env = rewire('../src/index');

        const result = await env.getDeployInfo();
        expect(result).to.deep.equal({
          version: '4.1.0',
          date: '2023-01-01',
          base_version: '4.0.0',
          timestamp: '2023-01-02'
        });
        expect(request.get.callCount).to.equal(1);
        expect(request.get.args).to.deep.equal([
          [
            {
              url: 'http://admin:pass@localhost:5984/medicdb/_design/medic',
              headers: { 'user-agent': 'Community Health Toolkit/4.18.0 (test-platform,test-arch)' } // Match the dummy user-agent
            }
          ]
        ]);
      });

      it('should use cache on subsequent calls', async () => {
        const ddoc = {
          _id: '_design/medic',
          build_info: { version: '4.1.0' }
        };

        sinon.stub(request, 'get').resolves(ddoc);
        const env = rewire('../src/index');

        const result1 = await env.getDeployInfo();
        const result2 = await env.getDeployInfo();

        expect(result1).to.deep.equal(result2);
        expect(request.get.callCount).to.equal(1);
      });

      it('should throw error if request fails', async () => {
        sinon.stub(request, 'get').rejects(new Error('Failed to fetch'));
        sinon.stub(logger, 'error');

        const env = rewire('../src/index');
        await expect(env.getDeployInfo()).to.eventually.be.rejectedWith('Failed to fetch');
      });
    });

    describe('getVersion', () => {
      it('should return version from deploy info', async () => {
        const ddoc = {
          _id: '_design/medic',
          build_info: { version: '4.1.0' }
        };

        sinon.stub(request, 'get').resolves(ddoc);
        const env = rewire('../src/index');

        const version = await env.getVersion();
        expect(version).to.equal('4.1.0');
      });

      it('should return unknown on error', async () => {
        sinon.stub(request, 'get').rejects(new Error('Failed to fetch'));
        const env = rewire('../src/index');

        const version = await env.getVersion();
        expect(version).to.equal('unknown');
      });
    });
  });
});
