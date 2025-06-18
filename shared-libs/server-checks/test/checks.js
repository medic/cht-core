const chai = require('chai');
chai.config.truncateThreshold = 0;
const sinon = require('sinon');
const request = require('@medic/couch-request');

const service = require('../src/checks');

describe('checks', () => {

  afterEach(() => sinon.restore());

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
      sinon.stub(request, 'get').rejects({ status: 401 });
      await service.checkCouchDbNoAdminPartyMode('http://admin:pass@localhost:5984');
      // no error thrown = pass
      // ensure credentials are removed
      chai.expect(request.get.args[0][0]).to.deep.equal({ url: 'http://localhost:5984/', json: false, simple: false });
    });

    it('enabled', async () => {
      sinon.stub(request, 'get').resolves({ status: 200 });
      await chai.expect(service.checkCouchDbNoAdminPartyMode('http://localhost:5984'))
        .to.eventually.be.rejectedWith(
          'CouchDB security seems to be misconfigured. Accessing the db without authentication returned a 200 ' +
          'when a 401 was expected. See: https://github.com/medic/cht-core/blob/master/DEVELOPMENT.md#enabling-a-secure-couchdb'
        );
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
