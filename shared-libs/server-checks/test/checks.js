const chai = require('chai');
const sinon = require('sinon');
const http = require('http');
const request = require('@medic/couch-request');

const service = require('../src/checks');

describe('checks', () => {

  afterEach(() => sinon.restore());

  // eslint-disable-next-line no-console
  const log = idx => console.log.getCall(idx).args.map(arg => arg.toString()).join(' ');

  describe('checkServerUrl', () => {

    it('should allow urls with a single path segment', () => {
      const couchUrl = 'http://couch.db/dbname';
      chai.expect(() => service.checkServerUrl(couchUrl)).not.to.throw;
    });

    it('should ignore empty path segments', () => {
      const couchUrl = 'http://couch.db/////dbname/////';
      chai.expect(() => service.checkServerUrl(couchUrl)).not.to.throw;
    });

    it('should block urls with no path segments', () => {
      chai.expect(() => service.checkServerUrl('http://couch.db/')).to.throw(/segment/);
    });

    it('should block urls with multiple path segments', () => {
      const couchUrl = 'http://couch.db/path/to/db';
      chai.expect(() => service.checkServerUrl(couchUrl)).to.throw(/must have only one path segment/);
    });

  });

  describe('checkCouchDbNoAdminPartyMode', () => {

    it('disabled', async () => {
      sinon.stub(http, 'get').callsArgWith(1, { statusCode: 401 });
      await service.checkCouchDbNoAdminPartyMode('http://admin:pass@localhost:5984');
      // no error thrown = pass
      chai.expect(http.get.args[0][0]).to.equal('http://localhost:5984/'); // ensure credentials are removed
    });

    it('enabled', () => {
      sinon.stub(http, 'get').callsArgWith(1, { statusCode: 200 });
      return service.checkCouchDbNoAdminPartyMode('http://localhost:5984')
        .then(() => chai.assert.fail('should have thrown'))
        .catch((err) => {
          chai.assert.isTrue(err.toString().startsWith('Error: CouchDB security seems to be misconfigured'));
        });
    });

  });

  describe('checkCouchDbVersion', () => {

    it('handles error', () => {
      sinon.stub(request, 'get').rejects('error');
      return service.checkCouchDbVersion('something')
        .then(() => chai.assert.fail('should have thrown'))
        .catch(err => {
          chai.expect(err.toString()).to.equal('error');
        });
    });

    it('logs version', async () => {
      sinon.spy(console, 'log');
      sinon.stub(request, 'get').resolves({ version: '3.3.3' });
      await service.checkCouchDbVersion('something');
      chai.expect(request.get.callCount).to.equal(1);
      chai.expect(request.get.args[0][0].url).to.equal('something');
      chai.expect(log(0)).to.equal('CouchDB Version: 3.3.3');
    });

    it('throws on invalid version', async () => {
      sinon.stub(request, 'get').resolves({ version: '3.2.0' });
      return service.checkCouchDbVersion('something')
        .then(() => chai.assert.fail('should have thrown'))
        .catch(err => {
          chai.expect(err.toString()).to.equal('Error: CouchDB Version 3.2.0 is not supported, minimum is 3.3.0');
        });
    });

  });

  describe('checkCouchDbCluster', () => {

    it('set up correctly', async () => {
      sinon.stub(request, 'get');
      request.get.withArgs(sinon.match({ url: 'http://admin:pass@localhost:5984/_membership' })).resolves({
        all_nodes: ['a'],
        cluster_nodes: ['a'],
      });
      await service.checkCouchDbCluster('http://admin:pass@localhost:5984/');
      chai.expect(request.get.args[0][0]).to.deep.equal({ json: true, url: 'http://admin:pass@localhost:5984/_membership' });
    });

    it('unfinished cluster', async () => {
      sinon.stub(request, 'get');
      request.get.onCall(0).resolves({ all_nodes: ['a', 'c'], cluster_nodes: ['a', 'c'] });
      request.get.onCall(1).resolves({ all_nodes: ['b'], cluster_nodes: ['b'] });
      request.get.onCall(2).resolves({ all_nodes: ['b'], cluster_nodes: ['b'] });

      return service.checkCouchDbCluster('http://admin:pass@localhost:5984/')
        .then(() => chai.assert.fail('should have thrown'))
        .catch(err => {
          chai.expect(err.toString()).to.equal('Error: Cluster not ready');
          chai.expect(request.get.callCount).to.equal(3);
          chai.expect(request.get.args[0][0].url).to.equal('http://admin:pass@localhost:5984/_membership');
        });

    });

  });

  describe('checkCouchDbSystemDbs', () => {

    it('non existent system databases', () => {
      sinon.stub(request, 'get');
      request.get.withArgs(sinon.match({ url: 'http://admin:pass@localhost:5984/_users' })).rejects();
      request.get.withArgs(sinon.match({ url: 'http://admin:pass@localhost:5984/_replicator' })).resolves();
      request.get.withArgs(sinon.match({ url: 'http://admin:pass@localhost:5984/_global_changes' })).resolves();

      return service.checkCouchDbSystemDbs('http://admin:pass@localhost:5984/')
        .then(() => chai.assert.fail('should have thrown'))
        .catch(err => {
          chai.expect(err.toString()).to.equal('Error: System databases do not exist');
          chai.expect(request.get.callCount).to.equal(1);
        });
    });

    it('system databases exist', async () => {
      sinon.stub(request, 'get');
      request.get.withArgs(sinon.match({ url: 'http://admin:pass@localhost:5984/_users' })).resolves();
      request.get.withArgs(sinon.match({ url: 'http://admin:pass@localhost:5984/_replicator' })).resolves();
      request.get.withArgs(sinon.match({ url: 'http://admin:pass@localhost:5984/_global_changes' })).resolves();

      await service.checkCouchDbSystemDbs('http://admin:pass@localhost:5984/');
      chai.expect(request.get.callCount).to.equal(3);
    });

  });

});
