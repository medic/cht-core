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
    process = {
      versions: { node: '16.0.0' },
      env: { NODE_OPTIONS: { } },
      exit: sinon.stub(),
    };
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
          versions: { node: '9.11.1' },
          env: {
            NODE_OPTIONS: { },
          },
          exit: sinon.stub(),
        };
        service.__get__('nodeVersionCheck')();
        chai.assert.isTrue(console.log.called);
        chai.assert.equal(console.log.callCount, 2);
        chai.assert.isTrue(log(0).startsWith('Node Environment Options'));
        chai.expect(log(1)).to.equal('Node Version: 9.11.1 in development mode');
      });

      it('too old', () => {
        process = { versions: { node: '6.1.0' }, exit: sinon.stub() };
        service.__get__('nodeVersionCheck')();
        chai.assert.isTrue(console.log.called);
        chai.assert.equal(console.log.callCount, 1);
        chai.assert.equal(console.error.callCount, 1);
        chai.assert.equal(log(0), 'Error: Node version 6.1.0 is not supported, minimum is 8.0.0');
        chai.assert.equal(error(0), 'Fatal error initialising');
        chai.assert.equal(process.exit.callCount, 1);
      });

    });

    describe('env vars', () => {

      it('valid', () => {
        return Promise.resolve()
          .then(() => service.__get__('envVarsCheck')('http://couch.db', 'something'))
          .then(() => {
            chai.assert.equal(console.log.callCount, 2);
            chai.assert.equal(log(0), 'COUCH_URL http://couch.db/');
            chai.assert.equal(log(1), 'COUCH_NODE_NAME something');
          });
      });

      it('missing COUCH_NODE_NAME', () => {
        return service
          .__get__('envVarsCheck')('http://couch.db')
          .then(() => chai.assert.fail('should throw'))
          .catch((err) => {
            chai.assert.isTrue(err.startsWith('At least one required environment'));
          });
      });

      it('does not log credentials', () => {
        return Promise.resolve()
          .then(() => service.__get__('envVarsCheck')('http://admin:supersecret@localhost:5984', 'something'))
          .then(() => {
            chai.assert.equal(console.log.callCount, 2);
            chai.assert.equal(log(0), 'COUCH_URL http://localhost:5984/');
            chai.assert.equal(log(1), 'COUCH_NODE_NAME something');
          });
      });

    });

    describe('couch url path check', () => {
      it('should allow urls with a single path segment', () => {
        const couchUrl = 'http://couch.db/dbname';
        chai.expect(() => service.__get__('couchDbUrlCheck')(couchUrl)).not.to.throw;
      });

      it('should ignore empty path segments', () => {
        const couchUrl = 'http://couch.db/////dbname/////';
        chai.expect(() => service.__get__('couchDbUrlCheck')(couchUrl)).not.to.throw;
      });

      it('should block urls with no path segments', () => {
        chai.expect(() => service.__get__('couchDbUrlCheck')('http://couch.db/')).to.throw(/segment/);
      });

      it('should block urls with multiple path segments', () => {
        const couchUrl = 'http://couch.db/path/to/db';
        chai.expect(() => service.__get__('couchDbUrlCheck')(couchUrl)).to.throw(/must have only one path segment/);
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
      sinon.stub(http, 'get').callsArgWith(1, { statusCode: 401 });
      sinon.stub(request, 'get')
        .onCall(0).resolves({ all_nodes: [ 'nonode@nohost' ], cluster_nodes: [ 'nonode@nohost' ] })
        .onCall(1).resolves({ version: '2' });

      return service.check('http://admin:pass@localhost:5984/medic', 'nonode@nohost');
    });

    it('invalid couchdb version', () => {
      sinon.stub(http, 'get').callsArgWith(1, { statusCode: 401 });
      sinon.stub(request, 'get').rejects('error');

      return service
        .check('http://admin:pass@localhost:5984/medic', 'nonode@nohost')
        .then(() => chai.assert.fail('should throw'))
        .catch(err => {
          chai.expect(err.name).to.equal('error');
        });
    });

    it('invalid server', () => {
      sinon.stub(http, 'get').callsArgWith(1, {statusCode: 401});
      sinon.stub(request, 'get').resolves({ version: '2' });
      return service
        .check('http://admin:pass@localhost:5984', 'nonode@nohost')
        .then(() => chai.assert.fail('should throw'))
        .catch(err => {
          chai.expect(err.message).to.match(/Environment variable "COUCH_URL" must have only one path segment/);
        });
    });

    it('no node name', () => {
      sinon.stub(http, 'get').callsArgWith(1, {statusCode: 401});
      sinon.stub(request, 'get').resolves({ version: '2' });

      return service
        .check('http://admin:pass@localhost:5984/medic')
        .then(() => chai.assert.fail('should throw'))
        .catch(err => {
          chai.assert.isTrue(err.startsWith('At least one required environment'));
        });
    });
  });

  describe('Validate env node names', () => {
    it('invalid node name is caught', function() {
      sinon.stub(http, 'get').callsArgWith(1, { statusCode: 401 });
      sinon.stub(request, 'get')
        .onCall(0).resolves({ all_nodes: [ 'nonode@nohost' ], cluster_nodes: [ 'nonode@nohost' ] })
        .onCall(1).resolves({ version: '2' });

      return service
        .check('http://admin:pass@localhost:5984/medic', 'bad_node_name')
        .then(() => chai.assert.fail('should throw'))
        .catch(err => {
          chai.assert.isTrue(err.message.startsWith('Environment variable \'COUCH_NODE_NAME\' set to'));
        });
    });

    it('valid node name logged', function() {
      sinon.stub(http, 'get').callsArgWith(1, {statusCode: 401});
      sinon.stub(request, 'get')
        .onCall(0).resolves({ all_nodes: [ 'nonode@nohost' ], cluster_nodes: [ 'nonode@nohost' ] })
        .onCall(1).resolves({ version: '2' });

      return service.check('http://admin:pass@localhost:5984/medic', 'nonode@nohost').then(() => {
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
    it('should create service admin for every node and return updated urls', async () => {
      sinon.stub(request, 'get').resolves({ all_nodes: ['node1', 'node2', 'node3'] });
      sinon.stub(request, 'put').resolves();

      const result = await service.getServerUrls('http://admin:pass@localhost:5984/theDb', 'myUser');

      chai.expect(result.dbName).to.equal('theDb');
      chai.expect(result.serverUrl).to.equal('http://myUser:pass@localhost:5984/');
      chai.expect(request.get.callCount).to.equal(1);
      chai.expect(request.get.args[0]).to.deep.equal(['http://admin:pass@localhost:5984/_membership', { json: true }]);
      chai.expect(request.put.callCount).to.equal(3);
      chai.expect(request.put.args).to.deep.equal([
        [{ url: 'http://admin:pass@localhost:5984/_node/node1/_config/admins/myUser', json: true, body: 'pass' }],
        [{ url: 'http://admin:pass@localhost:5984/_node/node2/_config/admins/myUser', json: true, body: 'pass' }],
        [{ url: 'http://admin:pass@localhost:5984/_node/node3/_config/admins/myUser', json: true, body: 'pass' }],
      ]);
    });

    it('should format the database name correctly when it has one trailing slash', async () => {
      sinon.stub(request, 'get').resolves({ all_nodes: ['node1'] });
      sinon.stub(request, 'put').resolves();

      const result = await service.getServerUrls('http://admin:pass@localhost:5984/dbname/', 'adminuser');

      chai.expect(result.dbName).to.equal('dbname');
      chai.expect(result.serverUrl).to.deep.equal('http://adminuser:pass@localhost:5984/');
      chai.expect(result.couchUrl).to.deep.equal('http://adminuser:pass@localhost:5984/dbname');
    });

    it('should format the database name correctly when it has lots of slashes', async () => {
      sinon.stub(request, 'get').resolves({ all_nodes: ['node1'] });
      sinon.stub(request, 'put').resolves();

      const result = await service.getServerUrls('http://admin:pass@localhost:5984///adatabase////', 'newuser');

      chai.expect(result.dbName).to.equal('adatabase');
      chai.expect(result.serverUrl).to.equal('http://newuser:pass@localhost:5984/');
      chai.expect(result.couchUrl).to.equal('http://newuser:pass@localhost:5984/adatabase');
    });

    it('should throw error when get fails', async () => {
      sinon.stub(request, 'get').rejects({ an: 'error' });

      try {
        await service.getServerUrls('http://admin:pass@localhost:5984/dbname/', 'myUser');
        chai.expect.fail('Should have thrown');
      } catch (err) {
        chai.expect(err).to.deep.equal({ an: 'error' });
      }
    });

    it('should throw error when put fails', async () => {
      sinon.stub(request, 'get').resolves({ all_nodes: ['node1', 'node2'] });
      sinon.stub(request, 'put').rejects({ error: 'whops' });

      try {
        await service.getServerUrls('http://admin:pass@localhost:5984/dbname/', 'admin');
        chai.expect.fail('Should have thrown');
      } catch (err) {
        chai.expect(err).to.deep.equal({ error: 'whops' });
      }
    });

    it('should throw error when url is invalid', async () => {
      try {
        await service.getServerUrls('not a url', 'admin');
        chai.expect.fail('Should have thrown');
      } catch (err) {
        chai.expect(err.code).to.equal('ERR_INVALID_URL');
      }
    });
  });
});
