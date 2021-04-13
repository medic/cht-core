const { expect } = require('chai');
const environment = require('../../src/lib/environment');
const sinon = require('sinon');

describe('environment', () => {

  afterEach(sinon.restore);

  describe('isProduction',  () => {

    it('localhost and port environment return false', () => {
      sinon.stub(environment, 'instanceUrl').get(() => 'http://admin:pass@localhost:5988');
      expect(environment.isProduction()).to.be.false;
    });

    it('localhost without environment return false', () => {
      sinon.stub(environment, 'instanceUrl').get(() => 'http://admin:pass@localhost');
      expect(environment.isProduction()).to.be.false;
    });

    it('ip6-localhost and port environment return false', () => {
      sinon.stub(environment, 'instanceUrl').get(() => 'http://admin:pass@ip6-localhost:5988');
      expect(environment.isProduction()).to.be.false;
    });

    it('127.0.0.1 environment return false', () => {
      sinon.stub(environment, 'instanceUrl').get(() => 'http://admin:pass@127.0.0.1:5988');
      expect(environment.isProduction()).to.be.false;
    });

    it('::1 IPv6 loopback environment return false', () => {
      sinon.stub(environment, 'instanceUrl').get(() => 'http://admin:pass@[::1]:5988');
      expect(environment.isProduction()).to.be.false;
    });

    it('200.15.0.87 environment return true', () => {
      sinon.stub(environment, 'instanceUrl').get(() => 'http://admin:pass@200.15.0.87:5988');
      expect(environment.isProduction()).to.be.true;
    });

    it('prod.* environment return true', () => {
      sinon.stub(environment, 'instanceUrl').get(() => 'http://admin:pass@prod.some.com:5988');
      expect(environment.isProduction()).to.be.true;
    });

    it('prod.* environment return true', () => {
      sinon.stub(environment, 'instanceUrl').get(() => 'https://parner-ab.medicmobile.org');
      expect(environment.isProduction()).to.be.true;
    });

    it('dev.* environment return true', () => {
      sinon.stub(environment, 'instanceUrl').get(() => 'http://admin:pass@dev.some.com:5988');
      expect(environment.isProduction()).to.be.false;
    });

    it('staging.* environment return true', () => {
      sinon.stub(environment, 'instanceUrl').get(() => 'http://admin:pass@staging.proj1.heroku.com:5988');
      expect(environment.isProduction()).to.be.false;
    });

    it('dev-SOME.* environment return true', () => {
      sinon.stub(environment, 'instanceUrl').get(() => 'https://demo.dev-v1.medicmobile.org');
      expect(environment.isProduction()).to.be.false;
    });
  });
});
