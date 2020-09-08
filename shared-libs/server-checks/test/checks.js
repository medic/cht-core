const chai = require('chai');
const sinon = require('sinon');
const service = require('../src/checks');
const http = require('http');
const request = require('request');

/* eslint-disable no-console */

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

  const getLogOutput = (level, order) => console[level].getCall(order).args.map(arg => arg.toString()).join(' ');

  const log = order => getLogOutput('log', order);
  const error = order => getLogOutput('error', order);

  describe('checks', () => {

    describe('node version', () => {

      it('valid', () => {
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

      it('too old', () => {
        process = {versions: {node: '6.1.0'}, exit: () => 0};
        service._nodeVersionCheck();
        chai.assert.isTrue(console.log.called);
        chai.assert.equal(console.log.callCount, 1);
        chai.assert.equal(console.error.callCount, 1);
        chai.assert.equal(log(0), 'Error: Node version 6.1.0 is not supported, minimum is 8.0.0');
        chai.assert.equal(error(0), 'Fatal error initialising');
      });

    });

    describe('env vars', () => {

      it('valid', () => {
        process = { env: {
          COUCH_URL: 'something',
          COUCH_NODE_NAME: 'something'
        } };
        return Promise.resolve()
          .then(() => service._envVarsCheck())
          .then(() => {
            chai.assert.equal(console.log.callCount, 2);
            chai.assert.equal(log(0), 'COUCH_URL something');
            chai.assert.equal(log(1), 'COUCH_NODE_NAME something');
          });
      });

      it('missing COUCH_NODE_NAME', () => {
        process = { env: { COUCH_URL: 'something' } };
        return service._envVarsCheck().catch((err) => {
          chai.assert.isTrue(err.startsWith('At least one required environment'));
        });
      });

      it('does not log credentials', () => {
        process = { env: {
          COUCH_URL: 'http://admin:supersecret@localhost:5984',
          COUCH_NODE_NAME: 'something'
        } };
        return Promise.resolve()
          .then(() => service._envVarsCheck())
          .then(() => {
            chai.assert.equal(console.log.callCount, 2);
            chai.assert.equal(log(0), 'COUCH_URL http://localhost:5984/');
            chai.assert.equal(log(1), 'COUCH_NODE_NAME something');
          });
      });

    });

    describe('admin party', () => {

      it('disabled', () => {
        process = {env: {COUCH_URL: 'http://localhost:5984'}};
        sinon.stub(http, 'get').callsArgWith(1, {statusCode: 401});
        return service._couchDbNoAdminPartyModeCheck();
      });

      it('enabled', () => {
        process = {env: {COUCH_URL: 'http://localhost:5984'}};
        sinon.stub(http, 'get').callsArgWith(1, {statusCode: 200});
        return service._couchDbNoAdminPartyModeCheck().catch((err) => {
          chai.assert.equal(console.error.callCount, 2);
          chai.assert.equal(error(0), 'Expected a 401 when accessing db without authentication.');
          chai.assert.equal(error(1), 'Instead we got a 200');
          chai.assert.isTrue(err.toString().startsWith('Error: CouchDB security seems to be misconfigured'));
        });
      });

    });

    describe('couchdb version', () => {

      it('handles error', () => {
        sinon.stub(request, 'get').callsArgWith(1, 'error');
        return service._couchDbVersionCheck('something').catch(err => {
          chai.assert.equal(err, 'error');
        });
      });

      it('logs version', () => {
        sinon.stub(request, 'get').callsArgWith(1, null, null, {version: '2'});
        return service._couchDbVersionCheck('something').then(() => {
          chai.assert.equal(log(0), 'CouchDB Version: 2');
        });
      });

    });

  });

  describe('entry point check', () => {

    it('valid server', function() {
      process = {
        versions: {node: '9.11.1'},
        env: {
          COUCH_URL: 'http://admin:pass@localhost:5984',
          COUCH_NODE_NAME: 'nonode@nohost'
        },
        exit: () => 0
      };
      sinon.stub(http, 'get').callsArgWith(1, {statusCode: 401});
      sinon.stub(request, 'get')
        .onCall(0).callsArgWith(1, null, null, { all_nodes: [ 'nonode@nohost' ], cluster_nodes: [ 'nonode@nohost' ] })
        .onCall(1).callsArgWith(1, null, null, { version: '2' });
      return service.check('something');
    });


    it('invalid couchdb version', function() {
      process = {
        versions: {node: '9.11.1'},
        env: {
          COUCH_URL: 'http://admin:pass@localhost:5984',
          COUCH_NODE_NAME: 'nonode@nohost'
        },
        exit: () => 0
      };
      sinon.stub(http, 'get').callsArgWith(1, {statusCode: 401});
      sinon.stub(request, 'get').callsArgWith(1, 'error');
      return service.check('something').catch(err => {
        chai.expect(err).to.equal('error');
      });
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

  describe('Validate env node names', () => {
    it('invalid node name is caught', function() {
      process = {
        versions: {node: '9.11.1'},
        env: {
          COUCH_URL: 'http://admin:pass@localhost:5984',
          COUCH_NODE_NAME: 'bad_node_name'
        },
        exit: () => 0
      };
      sinon.stub(request, 'get').callsArgWith(1, 'error', null, {all_nodes: [ 'nonode@nohost' ] });
      return service.check('something').catch(err => {
        chai.assert.isTrue(err.startsWith('Environment variable \'COUCH_NODE_NAME\' set to'));
      });
    });

    it('valid node name logged', function() {
      process = {
        versions: {node: '9.11.1'},
        env: {
          COUCH_URL: 'http://admin:pass@localhost:5984',
          COUCH_NODE_NAME: 'nonode@nohost'
        },
        exit: () => 0
      };
      sinon.stub(http, 'get').callsArgWith(1, {statusCode: 401});
      sinon.stub(request, 'get').callsArgWith(1, null, null, {all_nodes: [ 'nonode@nohost' ], version: '2' });

      return service.check('something').then(() => {
        chai.assert.equal(console.log.callCount, 6);
        chai.assert.equal(log(4), 'Environment variable "COUCH_NODE_NAME" matches server "nonode@nohost"');
      });
    });
  });

  describe('getCouchDbVersion', () => {
    it('should return couchdb version', () => {
      sinon.stub(request, 'get').callsArgWith(1, null, null, { version: '2.2.0' });
      return service.getCouchDbVersion('someURL').then(version => {
        chai.expect(version).to.equal('2.2.0');
        chai.expect(request.get.callCount).to.equal(1);
        chai.expect(request.get.args[0][0]).to.deep.equal({ url: 'someURL', json: true });
      });
    });

    it('should reject errors', () => {
      sinon.stub(request, 'get').callsArgWith(1, 'someErr', null, null);
      return service
        .getCouchDbVersion('someOtherURL')
        .then(() => chai.expect(false).to.equal('Should have thrown'))
        .catch(err => {
          chai.expect(err).to.equal('someErr');
          chai.expect(request.get.callCount).to.equal(1);
          chai.expect(request.get.args[0][0]).to.deep.equal({ url: 'someOtherURL', json: true });
        });
    });
  });
});
