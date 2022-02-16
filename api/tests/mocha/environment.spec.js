const rewire = require('rewire');
const { expect } = require('chai');
const path = require('path');
const sinon = require('sinon');

const serverChecks = require('@medic/server-checks');

let environment;
const originalUnitTestEnv = process.env.UNIT_TEST_ENV;
const originalCouchUrl = process.env.COUCH_URL;

describe('environment', () => {
  beforeEach(() => {
    delete process.env.UNIT_TEST_ENV;
    process.env.COUCH_URL = 'http://admin:pass@couch.db:8234/db_name';
    environment = rewire('../../src/environment');
  });

  afterEach(() => {
    process.env.UNIT_TEST_ENV = originalUnitTestEnv;
    process.env.COUCH_URL = originalCouchUrl;
    sinon.restore();
  });

  it('buildPath should return build path', () => {
    expect(environment.buildPath).to.equal(path.resolve(__dirname, '../../build'));
  });

  it('getStaticPath should return static path', () => {
    expect(environment.staticPath).to.equal(path.resolve(__dirname, '../../build/static'));
  });

  it('getDefaultDocsPath should return default docs path', () => {
    expect(environment.defaultDocsPath).to.equal(path.resolve(__dirname, '../../build/default-docs'));
  });

  it('getResourcesPath should return resources path', () => {
    expect(environment.resourcesPath).to.equal(path.resolve(__dirname, '../../resources'));
  });

  it('should set, get and update deploy info correctly', () => {
    expect(environment.getDeployInfo()).to.equal(undefined);
    environment.setDeployInfo({ version: 'my version' });
    expect(environment.getDeployInfo()).to.deep.equal({ version: 'my version' });
    environment.setDeployInfo(false);
    expect(environment.getDeployInfo()).to.equal(false);
    environment.setDeployInfo({ version: 'new version', timestamp: 100 });
    expect(environment.getDeployInfo()).to.deep.equal({ version: 'new version', timestamp: 100 });
  });

  describe('initialize', () => {
    it('should not initialize urls immediately', () => {
      expect(environment.couchUrl).to.equal(undefined);
      expect(environment.serverUrl).to.equal(undefined);
      expect(environment.protocol).to.equal(undefined);
      expect(environment.port).to.equal(undefined);
      expect(environment.host).to.equal(undefined);
      expect(environment.db).to.equal(undefined);
      expect(environment.username).to.equal(undefined);
      expect(environment.password).to.equal(undefined);
      expect(environment.isTesting).to.equal(undefined);
    });

    it('should create user and set urls', async () => {
      sinon.stub(serverChecks, 'getServerUrls').resolves({
        serverUrl: 'http://cht-api:pas@couch.db:8234/',
        couchUrl: 'http://cht-api:pas@couch.db:8234/db_name',
        dbName: 'db_name',
      });

      await environment.initialize();

      expect(environment.couchUrl).to.equal('http://cht-api:pas@couch.db:8234/db_name');
      expect(environment.serverUrl).to.equal('http://cht-api:pas@couch.db:8234/');
      expect(environment.protocol).to.equal('http:');
      expect(environment.port).to.equal('8234');
      expect(environment.host).to.equal('couch.db');
      expect(environment.db).to.equal('db_name');
      expect(environment.username).to.equal('cht-api');
      expect(environment.password).to.equal('pas');
      expect(environment.isTesting).to.equal(false);

      expect(serverChecks.getServerUrls.callCount).to.equal(1);
      expect(serverChecks.getServerUrls.args[0]).to.deep.equal(['cht-api']);
    });

    it('should set testing property', async () => {
      process.env.COUCH_URL = 'http://admin:pass@couch.db:8234/medic-test';
      environment = rewire('../../src/environment');

      sinon.stub(serverChecks, 'getServerUrls').resolves({
        serverUrl: 'http://cht-api:pas@couch.db:8234/',
        couchUrl: 'http://cht-api:pas@couch.db:8234/medic-test',
        dbName: 'medic-test',
      });

      await environment.initialize();

      expect(environment.couchUrl).to.equal('http://cht-api:pas@couch.db:8234/medic-test');
      expect(environment.serverUrl).to.equal('http://cht-api:pas@couch.db:8234/');
      expect(environment.protocol).to.equal('http:');
      expect(environment.port).to.equal('8234');
      expect(environment.host).to.equal('couch.db');
      expect(environment.db).to.equal('medic-test');
      expect(environment.username).to.equal('cht-api');
      expect(environment.password).to.equal('pas');
      expect(environment.isTesting).to.equal(true);
    });
  });
});
