const chai = require('chai'),
    sinon = require('sinon'),
    service = require('../src/checks'),
    http = require('http'),
    request = require('request');

describe('Server Checks service', () => {

  'use strict';

  let originalProcess;

  beforeEach(() => {
    originalProcess = process;
    sinon.spy(console, 'log');
    sinon.spy(console, 'error');
  });

  afterEach(() => {
    sinon.restore();
    process = originalProcess;
  });

  const log = order => {
    return console.log.getCall(order).args[0].toString();
  };

  const error = order => {
    return console.error.getCall(order).args[0].toString();
  };

  describe('checks', () => {

    it('valid node version', () => {
      process = {
        versions: {node: '9.11.1'},
        env: {},
        exit: () => 0
      };
      service._nodeVersionCheck();
      chai.assert.isTrue(console.log.called);
      chai.assert.equal(console.log.callCount, 2);
      chai.assert.isTrue(log(0).startsWith('Node Environment Options'));
      chai.expect(log(1)).to.equal('Node Version: 9.11.1 in development mode');
    });

    it('invalid node version', () => {
      process = {versions: {node: '6.1.0'}, exit: () => 0};
      service._nodeVersionCheck();
      chai.assert.isTrue(console.log.called);
      chai.assert.equal(console.log.callCount, 1);
      chai.assert.equal(console.error.callCount, 1);
      chai.assert.equal(log(0), 'Error: Node version 6.1.0 is not supported, minimum is 8.0.0');
      chai.assert.equal(error(0), 'Fatal error initialising');
    });

    it('valid env vars', () => {
      process = {env: {COUCH_URL: 'something', COUCH_NODE_NAME: 'something'}};
      return service._envVarsCheck();
    });

    it('invalid env vars', () => {
      process = {env: {COUCH_URL: 'something'}};
      return service._envVarsCheck().catch((err) => {
        chai.assert.isTrue(err.startsWith('At least one required environment'));
      });
    });

    it('couchdb no admin party mode', () => {
      process = {env: {COUCH_URL: 'http://localhost:5984'}};
      sinon.stub(http, 'get').callsArgWith(1, {statusCode: 401});
      return service._couchDbNoAdminPartyModeCheck();
    });

    it('couchdb admin party mode', () => {
      process = {env: {COUCH_URL: 'http://localhost:5984'}};
      sinon.stub(http, 'get').callsArgWith(1, {statusCode: 200});
      return service._couchDbNoAdminPartyModeCheck().catch((err) => {
        chai.assert.equal(console.error.callCount, 2);
        chai.assert.equal(error(0), 'Expected a 401 when accessing db without authentication.');
        chai.assert.equal(error(1), 'Instead we got a 200');
        chai.assert.isTrue(err.toString().startsWith('Error: CouchDB security seems to be misconfigured'));
      });
    });

    it('couchdb valid version check', () => {
      sinon.stub(request, 'get').callsArgWith(1, null, null, {version: '2'});
      return service._couchDbVersionCheck('something').then(() => {
        chai.assert.equal(log(0), 'CouchDB Version: 2');
      });
    });

    it('couchdb invalid version check', () => {
      sinon.stub(request, 'get').callsArgWith(1, 'error');
      return service._couchDbVersionCheck('something').catch(err => {
        chai.assert.equal(err, 'error');
      });
    });
  });

  describe('entry point check', () => {

    it('valid server', function() {
      process = {
        versions: {node: '9.11.1'},
        env: {
          COUCH_URL: 'http://admin:pass@localhost:5984',
          COUCH_NODE_NAME: 'something'
        },
        exit: () => 0
      };
      sinon.stub(http, 'get').callsArgWith(1, {statusCode: 401});
      sinon.stub(request, 'get').callsArgWith(1, null, null, {version: '2'});
      return service.check('something');
    });

    it('invalid server', function() {
      process = {
        versions: {node: '9.11.1'},
        env: {
          COUCH_URL: 'http://admin:pass@localhost:5984'
        },
        exit: () => 0
      };
      sinon.stub(http, 'get').callsArgWith(1, {statusCode: 401});
      sinon.stub(request, 'get').callsArgWith(1, null, null, {version: '2'});
      return service.check('something').catch(err => {
        chai.assert.isTrue(err.startsWith('At least one required environment'));
      });
    });

  });
});
