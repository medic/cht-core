const { expect } = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');
const logger = require('@medic/logger');

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

    expect(env).to.deep.equal({
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
});
