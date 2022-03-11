const chai = require('chai');
const sinon = require('sinon');
const http = require('http');
const request = require('request-promise-native');
const rewire = require('rewire');

let service;

/* eslint-disable no-console */

describe('Server Checks service', () => {

  'use strict';

  let originalProcess;

  beforeEach(() => {
    originalProcess = process;
    sinon.spy(console, 'log');
    sinon.spy(console, 'error');
    service = rewire('../src/checks');
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
          versions: { node: '16.11.1' },
          env: {},
          exit: sinon.stub(),
        };
        service.__get__('nodeVersionCheck')();
        chai.assert.isTrue(console.log.called);
        chai.assert.equal(console.log.callCount, 2);
        chai.assert.isTrue(log(0).startsWith('Node Environment Options'));
        chai.expect(log(1)).to.equal('Node Version: 16.11.1 in development mode');
      });

      it('too old', () => {
        process = { versions: { node: '12.1.0' }, exit: sinon.stub() };
        service.__get__('nodeVersionCheck')();
        chai.assert.isTrue(console.log.called);
        chai.assert.equal(console.log.callCount, 1);
        chai.assert.equal(console.error.callCount, 1);
        chai.assert.equal(log(0), 'Error: Node version 12.1.0 is not supported, minimum is 16.0.0');
        chai.assert.equal(error(0), 'Fatal error initialising');
      });

    });

    describe('couch url path check', () => {
      it('should allow urls with a single path segment', () => {
        const couchUrl = 'http://couch.db/dbname';
        chai.expect(() => service.__get__('checkServerUrl')(couchUrl)).not.to.throw;
      });

      it('should ignore empty path segments', () => {
        const couchUrl = 'http://couch.db/////dbname/////';
        chai.expect(() => service.__get__('checkServerUrl')(couchUrl)).not.to.throw;
      });

      it('should block urls with no path segments', () => {
        chai.expect(() => service.__get__('checkServerUrl')('http://couch.db/')).to.throw(/segment/);
      });

      it('should block urls with multiple path segments', () => {
        const couchUrl = 'http://couch.db/path/to/db';
        chai.expect(() => service.__get__('checkServerUrl')(couchUrl)).to.throw(/must have only one path segment/);
      });
    });

    describe('admin party', () => {

      it('disabled', () => {
        sinon.stub(http, 'get').callsArgWith(1, { statusCode: 401 });
        return service.__get__('couchDbNoAdminPartyModeCheck')('http://localhost:5984');
      });

      it('enabled', () => {
        sinon.stub(http, 'get').callsArgWith(1, { statusCode: 200 });
        return service
          .__get__('couchDbNoAdminPartyModeCheck')('http://localhost:5984')
          .then(() => chai.assert.fail('should have thrown'))
          .catch((err) => {
            chai.assert.equal(console.error.callCount, 2);
            chai.assert.equal(error(0), 'Expected a 401 when accessing db without authentication.');
            chai.assert.equal(error(1), 'Instead we got a 200');
            chai.assert.isTrue(err.toString().startsWith('Error: CouchDB security seems to be misconfigured'));
          });
      });

    });

    describe('couchdb version', () => {

      it('handles error', () => {
        sinon.stub(request, 'get').rejects('error');
        return service
          .__get__('couchDbVersionCheck')('something')
          .then(() => chai.assert.fail('should have thrown'))
          .catch(err => {
            chai.assert.equal(err, 'error');
          });
      });

      it('logs version', () => {
        sinon.stub(request, 'get').resolves({ version: '2' });
        return service.__get__('couchDbVersionCheck')('something').then(() => {
          chai.assert.equal(log(0), 'CouchDB Version: 2');
        });
      });
    });
  });

  describe('entry point check', () => {

    it('valid server', function() {
      process = {
        versions: { node: '16.11.1' },
        env: { NODE_OPTIONS: { }},
        exit: sinon.stub(),
      };
      sinon.stub(http, 'get').callsArgWith(1, { statusCode: 401 });
      sinon.stub(request, 'get').resolves({ version: '2' });
      return service.check('http://admin:pass@localhost:5984/medic');
    });


    it('invalid couchdb version', function() {
      process = {
        versions: { node: '16.11.1' },
        env: { NODE_OPTIONS: { }},
        exit: sinon.stub(),
      };
      sinon.stub(http, 'get').callsArgWith(1, { statusCode: 401 });
      sinon.stub(request, 'get').rejects({ an: 'error' });
      return service.check('http://admin:pass@localhost:5984/medic').catch(err => {
        chai.expect(err).to.deep.equal({ an: 'error' });
      });
    });

    it('invalid server', function() {
      process = {
        versions: { node: '16.11.1' },
        env: { NODE_OPTIONS: { }},
        exit: sinon.stub(),
      };
      sinon.stub(http, 'get').callsArgWith(1, { statusCode: 401 });
      sinon.stub(request, 'get').resolves({ version: '2' });
      return service.check().catch(err => {
        chai.assert.include(err.message, 'Environment variable "COUCH_URL" is required');
      });
    });

    it('too many segments', function() {
      process = {
        versions: { node: '16.11.1' },
        env: { NODE_OPTIONS: { }},
        exit: sinon.stub(),
      };
      sinon.stub(http, 'get').callsArgWith(1, { statusCode: 401 });
      sinon.stub(request, 'get').resolves({ version: '2' });
      return service
        .check('http://admin:pass@localhost:5984/path/to/db')
        .then(() => chai.assert.fail('should have thrown'))
        .catch(err => {
          chai.assert.include(err.message, 'Environment variable "COUCH_URL" must have only one path segment');
        });
    });

  });

  describe('getCouchDbVersion', () => {
    it('should return couchdb version', () => {
      sinon.stub(request, 'get').resolves({ version: '2.2.0' });
      return service.getCouchDbVersion('someURL').then(version => {
        chai.expect(version).to.equal('2.2.0');
        chai.expect(request.get.callCount).to.equal(1);
        chai.expect(request.get.args[0][0]).to.deep.equal({ url: 'someURL', json: true });
      });
    });

    it('should reject errors', () => {
      sinon.stub(request, 'get').rejects({ some: 'err' });
      return service
        .getCouchDbVersion('someOtherURL')
        .then(() => chai.expect.fail('Should have thrown'))
        .catch(err => {
          chai.expect(err).to.deep.equal({ some: 'err' });
          chai.expect(request.get.callCount).to.equal(1);
          chai.expect(request.get.args[0][0]).to.deep.equal({ url: 'someOtherURL', json: true });
        });
    });
  });
});
