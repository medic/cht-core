const chai = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');
const http = require('http');
const request = require('request-promise-native');

/* eslint-disable no-console */

let service;

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
          versions: {node: '9.11.1'},
          env: {},
          exit: () => 0
        };
        service.__get__('nodeVersionCheck')();
        chai.assert.isTrue(console.log.called);
        chai.assert.equal(console.log.callCount, 2);
        chai.assert.isTrue(log(0).startsWith('Node Environment Options'));
        chai.expect(log(1)).to.equal('Node Version: 9.11.1 in development mode');
      });

      it('too old', () => {
        process = {versions: {node: '6.1.0'}, exit: () => 0};
        service.__get__('nodeVersionCheck')();
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
          COUCH_URL: 'http://couch.db',
          COUCH_NODE_NAME: 'something'
        } };
        service = rewire('../src/checks');
        return Promise.resolve()
          .then(() => service.__get__('envVarsCheck')())
          .then(() => {
            chai.assert.equal(console.log.callCount, 2);
            chai.assert.equal(log(0), 'COUCH_URL http://couch.db/');
            chai.assert.equal(log(1), 'COUCH_NODE_NAME something');
          });
      });

      it('missing COUCH_NODE_NAME', () => {
        process = { env: { COUCH_URL: 'something' } };
        return service
          .__get__('envVarsCheck')()
          .then(() => chai.assert.fail('should throw'))
          .catch((err) => {
            chai.assert.isTrue(err.startsWith('At least one required environment'));
          });
      });

      it('does not log credentials', () => {
        process = { env: {
          COUCH_URL: 'http://admin:supersecret@localhost:5984',
          COUCH_NODE_NAME: 'something'
        } };
        service = rewire('../src/checks');
        return Promise.resolve()
          .then(() => service
            .__get__('envVarsCheck')())
          .then(() => {
            chai.assert.equal(console.log.callCount, 2);
            chai.assert.equal(log(0), 'COUCH_URL http://localhost:5984/');
            chai.assert.equal(log(1), 'COUCH_NODE_NAME something');
          });
      });

    });

    describe('admin party', () => {

      it('disabled', () => {
        process = { env: { COUCH_URL: 'http://localhost:5984' }};
        sinon.stub(http, 'get').callsArgWith(1, { statusCode: 401 });
        return service.__get__('couchDbNoAdminPartyModeCheck')();
      });

      it('enabled', () => {
        process = {env: {COUCH_URL: 'http://localhost:5984'}};
        service = rewire('../src/checks');
        sinon.stub(http, 'get').callsArgWith(1, {statusCode: 200});
        return service
          .__get__('couchDbNoAdminPartyModeCheck')()
          .then(() => chai.assert.fail('should throw'))
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
          .then(() => chai.assert.fail('should throw'))
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
        versions: {node: '9.11.1'},
        env: {
          COUCH_URL: 'http://admin:pass@localhost:5984',
          COUCH_NODE_NAME: 'nonode@nohost'
        },
        exit: () => 0
      };
      sinon.stub(http, 'get').callsArgWith(1, {statusCode: 401});
      sinon.stub(request, 'get')
        .onCall(0).resolves({ all_nodes: [ 'nonode@nohost' ], cluster_nodes: [ 'nonode@nohost' ] })
        .onCall(1).resolves({ version: '2' });

      service = rewire('../src/checks');

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
      sinon.stub(request, 'get').rejects('error');
      service = rewire('../src/checks');

      return service
        .check('something')
        .then(() => chai.assert.fail('should throw'))
        .catch(err => {
          chai.expect(err.name).to.equal('error');
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
      sinon.stub(request, 'get').resolves({ version: '2' });
      return service
        .check('something')
        .then(() => chai.assert.fail('should throw'))
        .catch(err => {
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
      sinon.stub(http, 'get').callsArgWith(1, { statusCode: 401 });
      sinon.stub(request, 'get')
        .onCall(0).resolves({ all_nodes: [ 'nonode@nohost' ], cluster_nodes: [ 'nonode@nohost' ] })
        .onCall(1).resolves({ version: '2' });
      return service
        .check('something')
        .then(() => chai.assert.fail('should throw'))
        .catch(err => {
          console.log(err);
          chai.assert.isTrue(err.message.startsWith('Environment variable \'COUCH_NODE_NAME\' set to'));
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
      sinon.stub(request, 'get')
        .onCall(0).resolves({ all_nodes: [ 'nonode@nohost' ], cluster_nodes: [ 'nonode@nohost' ] })
        .onCall(1).resolves({ version: '2' });

      service = rewire('../src/checks');

      return service.check('something').then(() => {
        chai.assert.equal(console.log.callCount, 7);
        chai.assert.equal(log(5), 'Environment variable "COUCH_NODE_NAME" matches server "nonode@nohost"');
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
      sinon.stub(request, 'get').rejects('someErr');
      return service
        .getCouchDbVersion('someOtherURL')
        .then(() => chai.expect.fail('Should have thrown'))
        .catch(err => {
          chai.expect(err.name).to.equal('someErr');
          chai.expect(request.get.callCount).to.equal(1);
          chai.expect(request.get.args[0][0]).to.deep.equal({ url: 'someOtherURL', json: true });
        });
    });
  });

  describe('getServerUrls', () => {
    it('should create service user for every node and return updated urls', async () => {
      process.env = {
        COUCH_URL: 'http://admin:pass@localhost:5984/theDb',
      };
      service = rewire('../src/checks');

      sinon.stub(request, 'get').resolves({ cluster_nodes: ['node1', 'node2', 'node3'] });
      sinon.stub(request, 'put').resolves();

      const result = await service.getServerUrls('myUser');

      chai.expect(result.dbName).to.equal('theDb');
      chai.expect(result.serverUrl).to.deep.equal(new URL('http://myUser:pass@localhost:5984'));
      chai.expect(result.couchUrl).to.deep.equal(new URL('http://myUser:pass@localhost:5984/theDb'));
      chai.expect(request.get.callCount).to.equal(1);
      chai.expect(request.get.args[0]).to.deep.equal(['http://admin:pass@localhost:5984/_membership', { json: true }]);
      chai.expect(request.put.callCount).to.equal(3);
      chai.expect(request.put.args).to.deep.equal([
        [{ url: 'http://admin:pass@localhost:5984/_node/node1/_config/admins/myUser', json: true, body: 'pass' }],
        [{ url: 'http://admin:pass@localhost:5984/_node/node2/_config/admins/myUser', json: true, body: 'pass' }],
        [{ url: 'http://admin:pass@localhost:5984/_node/node3/_config/admins/myUser', json: true, body: 'pass' }],
      ]);
    });

    it('should throw error when get fails', async () => {
      process.env = {
        COUCH_URL: 'http://admin:pass@localhost:5984/theDb',
      };
      service = rewire('../src/checks');

      sinon.stub(request, 'get').rejects({ an: 'error' });

      try {
        await service.getServerUrls('myUser');
        chai.expect.fail('Should have thrown');
      } catch (err) {
        chai.expect(err).to.deep.equal({ an: 'error' });
      }
    });

    it('should throw error when put fails', async () => {
      process.env = {
        COUCH_URL: 'http://admin:pass@localhost:5984/theDb',
      };
      service = rewire('../src/checks');

      sinon.stub(request, 'get').resolves({ cluster_nodes: ['node1', 'node2'] });
      sinon.stub(request, 'put').rejects({ error: 'whops' });

      try {
        await service.getServerUrls('admin');
        chai.expect.fail('Should have thrown');
      } catch (err) {
        chai.expect(err).to.deep.equal({ error: 'whops' });
      }
    });

    it('should throw error when url is invalid', async () => {
      process.env = {
        COUCH_URL: 'not a url',
      };
      service = rewire('../src/checks');

      try {
        await service.getServerUrls('admin');
        chai.expect.fail('Should have thrown');
      } catch (err) {
        chai.expect(err.code).to.equal('ERR_INVALID_URL');
      }
    });
  });
});
