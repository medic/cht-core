const chai = require('chai');
const sinon = require('sinon');

const checks = require('../src/checks');
const service = require('../src/index');

const VALID_URL = 'http://admin:pass@localhost/medic';
let originalProcess;

describe('entry point', () => {

  beforeEach(() => {
    originalProcess = process;
    // sinon.spy(console, 'log');
    // sinon.spy(console, 'error');
    // originalSetTimeout = setTimeout;
    // clock = sinon.useFakeTimers();
    // service = rewire('../src/checks');
  });

  afterEach(() => {
    sinon.restore();
    // clock.restore();
    process = originalProcess;
  });

  it('calls all checks', async () => {
    sinon.stub(checks, 'checkNodeVersion').resolves();
    sinon.stub(checks, 'checkServerUrl').resolves();
    sinon.stub(checks, 'checkCouchDbVersion').resolves();
    sinon.stub(checks, 'checkCouchDbNoAdminPartyMode').resolves();
    sinon.stub(checks, 'checkCouchDbCluster').resolves();
    sinon.stub(checks, 'checkCouchDbSystemDbs').resolves();
    await service.check(VALID_URL);
    chai.expect(checks.checkNodeVersion.callCount).to.equal(1);
    chai.expect(checks.checkServerUrl.callCount).to.equal(1);
    chai.expect(checks.checkCouchDbVersion.callCount).to.equal(1);
    chai.expect(checks.checkCouchDbNoAdminPartyMode.callCount).to.equal(1);
    chai.expect(checks.checkCouchDbCluster.callCount).to.equal(1);
    chai.expect(checks.checkCouchDbSystemDbs.callCount).to.equal(1);
    chai.expect(checks.checkServerUrl.args[0][0]).to.equal('http://admin:pass@localhost/medic');
    chai.expect(checks.checkCouchDbVersion.args[0][0]).to.equal('http://admin:pass@localhost/');
    chai.expect(checks.checkCouchDbNoAdminPartyMode.args[0][0]).to.equal('http://admin:pass@localhost/');
    chai.expect(checks.checkCouchDbCluster.args[0][0]).to.equal('http://admin:pass@localhost/');
    chai.expect(checks.checkCouchDbSystemDbs.args[0][0]).to.equal('http://admin:pass@localhost/');
  });

  it.only('throws server url errors', () => {
    sinon.stub(checks, 'checkNodeVersion').returns();
    sinon.stub(checks, 'checkServerUrl').throws('invalid server url');
    sinon.stub(process, 'exit');
    // const processMock = sinon.mock(process);
    // const exitExpectation = processMock
    //     .expects('exit')
    //     .withExactArgs(1)
    //     .once()
    //     .returns();
    service.check(VALID_URL);
    // exitExpectation.verify();
  });

  it.only('next', () => {});

  describe('retries couchdb errors', () => {});

  // let originalProcess;
  // let originalSetTimeout;
  // let clock;

  // beforeEach(() => {
  //   originalProcess = process;
  //   sinon.spy(console, 'log');
  //   sinon.spy(console, 'error');
  //   originalSetTimeout = setTimeout;
  //   clock = sinon.useFakeTimers();
  //   service = rewire('../src/checks');
  // });

  // afterEach(() => {
  //   sinon.restore();
  //   clock.restore();
  //   process = originalProcess;
  // });

  // const getLogOutput = (level, order) => console[level].getCall(order).args.map(arg => arg.toString()).join(' ');

  // const log = order => getLogOutput('log', order);
  // const error = order => getLogOutput('error', order);

  // describe('checks', () => {

  //   describe('node version', () => {

  //     it('valid', () => {
  //       process = {
  //         versions: { node: '16.11.1' },
  //         env: {},
  //         exit: sinon.stub(),
  //       };
  //       service.__set__('process', process);
  //       service.__get__('nodeVersionCheck')();
  //       chai.assert.isTrue(console.log.called);
  //       chai.assert.equal(console.log.callCount, 3);
  //       chai.expect(log(0)).to.equal('Node Version: 16.11.1');
  //       chai.expect(log(1)).to.equal('Node Mode: "development"');
  //       chai.assert.isTrue(log(2).startsWith('Node Environment Options'));
  //     });

  //   });

  //   describe('couch url path check', () => {
  //     it('should allow urls with a single path segment', () => {
  //       const couchUrl = 'http://couch.db/dbname';
  //       chai.expect(() => service.__get__('checkServerUrl')(couchUrl)).not.to.throw;
  //     });

  //     it('should ignore empty path segments', () => {
  //       const couchUrl = 'http://couch.db/////dbname/////';
  //       chai.expect(() => service.__get__('checkServerUrl')(couchUrl)).not.to.throw;
  //     });

  //     it('should block urls with no path segments', () => {
  //       chai.expect(() => service.__get__('checkServerUrl')('http://couch.db/')).to.throw(/segment/);
  //     });

  //     it('should block urls with multiple path segments', () => {
  //       const couchUrl = 'http://couch.db/path/to/db';
  //       chai.expect(() => service.__get__('checkServerUrl')(couchUrl)).to.throw(/must have only one path segment/);
  //     });
  //   });

  //   describe('admin party', () => {

  //     it('disabled', () => {
  //       sinon.stub(http, 'get').callsArgWith(1, { statusCode: 401 });
  //       return service.__get__('couchDbNoAdminPartyModeCheck')('http://localhost:5984');
  //     });

  //     it('enabled', () => {
  //       sinon.stub(http, 'get').callsArgWith(1, { statusCode: 200 });
  //       return service
  //         .__get__('couchDbNoAdminPartyModeCheck')('http://localhost:5984')
  //         .then(() => chai.assert.fail('should have thrown'))
  //         .catch((err) => {
  //           chai.assert.equal(console.error.callCount, 2);
  //           chai.assert.equal(error(0), 'Expected a 401 when accessing db without authentication.');
  //           chai.assert.equal(error(1), 'Instead we got a 200');
  //           chai.assert.isTrue(err.toString().startsWith('Error: CouchDB security seems to be misconfigured'));
  //         });
  //     });

  //   });

  //   describe('couchdb version', () => {

  //     it('handles error', () => {
  //       sinon.stub(request, 'get').rejects('error');
  //       return service
  //         .__get__('couchDbVersionCheck')('something')
  //         .then(() => chai.assert.fail('should have thrown'))
  //         .catch(err => {
  //           chai.assert.equal(err, 'error');
  //         });
  //     });

  //     it('logs version', async () => {
  //       sinon.stub(request, 'get').resolves({ version: '3.3.3' });
  //       await service.__get__('couchDbVersionCheck')('something');
  //       chai.assert.equal(log(0), 'CouchDB Version: 3.3.3');
  //     });
  //   });
  // });

  // describe('entry point check', () => {

  //   it('valid server', async () => {
  //     process = {
  //       versions: { node: '16.11.1' },
  //       env: { NODE_OPTIONS: { }},
  //       exit: sinon.stub(),
  //     };
  //     sinon.stub(http, 'get').callsArgWith(1, { statusCode: 401 });
  //     sinon.stub(request, 'get');
  //     request.get.withArgs(sinon.match({ url: 'http://admin:pass@localhost:5984/' })).resolves({ version: '3.3.3' });
  //     request.get.withArgs(sinon.match({ url: 'http://admin:pass@localhost:5984/_membership' })).resolves({
  //       all_nodes: ['a'],
  //       cluster_nodes: ['a'],
  //     });
  //     await service.check('http://admin:pass@localhost:5984/medic');

  //     chai.expect(http.get.args[0][0]).to.equal('http://localhost:5984/');
  //     chai.expect(request.get.args[0][0]).to.deep.equal({ json: true, url: 'http://admin:pass@localhost:5984/' });
  //   });

  //   it('valid server after a while', async () => {
  //     process = {
  //       versions: { node: '16.11.1' },
  //       env: { NODE_OPTIONS: { }},
  //       exit: sinon.stub(),
  //     };

  //     sinon.stub(http, 'get').onCall(0).callsArgWith(1, { statusCode: 200 });
  //     sinon.stub(request, 'get');
  //     request.get.withArgs(sinon.match({ url: 'http://admin:pass@localhost:5984/' })).resolves({ version: '3.3.3' });
  //     const unfinishedCluster = { all_nodes: ['a', 'b'], cluster_nodes: ['a'] };
  //     const finishedCluster = { all_nodes: ['a', 'b'], cluster_nodes: ['a', 'b'] };
  //     const membershipQuery = request.get.withArgs(sinon.match({ url: 'http://admin:pass@localhost:5984/_membership' }));
  //     membershipQuery.resolves(unfinishedCluster);
  //     request.get.withArgs(sinon.match({ url: 'http://admin:pass@localhost:5984/_users' })).resolves();
  //     request.get.withArgs(sinon.match({ url: 'http://admin:pass@localhost:5984/_replicator' })).resolves();
  //     request.get.withArgs(sinon.match({ url: 'http://admin:pass@localhost:5984/_global_changes' })).resolves();

  //     membershipQuery.onCall(72).resolves(finishedCluster);
  //     membershipQuery.onCall(73).resolves(finishedCluster);
  //     membershipQuery.onCall(74).resolves(finishedCluster);
  //     http.get.callsArgWith(1, { statusCode: 401 });

  //     const promise = service.check('http://admin:pass@localhost:5984/medic');
  //     Array.from({ length: 100 }).map(() => originalSetTimeout(() => clock.tick(1000)));
  //     await promise;

  //     chai.expect(request.get.callCount).to.equal(104);
  //     chai.expect(http.get.callCount).to.deep.equal(26);
  //   });

  //   it('unfinished cluster', async () => {
  //     process = {
  //       versions: { node: '16.11.1' },
  //       env: { NODE_OPTIONS: { }},
  //       exit: sinon.stub(),
  //     };
  //     sinon.stub(http, 'get').onCall(0).callsArgWith(1, { statusCode: 200 });
  //     sinon.stub(request, 'get');
  //     request.get.withArgs(sinon.match({ url: 'http://admin:pass@localhost:5984/' })).resolves({ version: '3.3.3' });

  //     const membershipQuery = request.get.withArgs(sinon.match({ url: 'http://admin:pass@localhost:5984/_membership' }));
  //     membershipQuery.onCall(0).resolves({ all_nodes: ['a'], cluster_nodes: ['a'] });
  //     membershipQuery.onCall(1).resolves({ all_nodes: ['b'], cluster_nodes: ['b'] });
  //     membershipQuery.onCall(2).resolves({ all_nodes: ['c'], cluster_nodes: ['c'] });
  //     membershipQuery.onCall(3).resolves({ all_nodes: ['a', 'c'], cluster_nodes: ['a', 'c'] });
  //     membershipQuery.onCall(4).resolves({ all_nodes: ['b'], cluster_nodes: ['b'] });
  //     membershipQuery.onCall(5).resolves({ all_nodes: ['b'], cluster_nodes: ['b'] });
  //     membershipQuery.onCall(6).resolves({ all_nodes: ['a', 'b', 'c'], cluster_nodes: ['a', 'b', 'c'] });
  //     membershipQuery.onCall(7).resolves({ all_nodes: ['a', 'b', 'c'], cluster_nodes: ['a', 'b', 'c'] });
  //     membershipQuery.onCall(8).resolves({ all_nodes: ['a', 'b', 'c'], cluster_nodes: ['a', 'b', 'c'] });

  //     request.get.withArgs(sinon.match({ url: 'http://admin:pass@localhost:5984/_users' })).resolves();
  //     request.get.withArgs(sinon.match({ url: 'http://admin:pass@localhost:5984/_replicator' })).resolves();
  //     request.get.withArgs(sinon.match({ url: 'http://admin:pass@localhost:5984/_global_changes' })).resolves();

  //     http.get.callsArgWith(1, { statusCode: 401 });

  //     const promise = service.check('http://admin:pass@localhost:5984/medic');
  //     Array.from({ length: 100 }).map(() => originalSetTimeout(() => clock.tick(1000)));
  //     await promise;

  //     chai.expect(request.get.callCount).to.equal(16);
  //     chai.expect(http.get.callCount).to.deep.equal(4);
  //   });

  //   it('non existent system databases', async () => {
  //     process = {
  //       versions: { node: '16.11.1' },
  //       env: { NODE_OPTIONS: { }},
  //       exit: sinon.stub(),
  //     };
  //     sinon.stub(http, 'get').onCall(0).callsArgWith(1, { statusCode: 200 });
  //     sinon.stub(request, 'get');
  //     request.get.withArgs(sinon.match({ url: 'http://admin:pass@localhost:5984/' })).resolves({ version: '3.3.3' });

  //     request.get
  //       .withArgs(sinon.match({ url: 'http://admin:pass@localhost:5984/_membership' }))
  //       .resolves({ all_nodes: ['a'], cluster_nodes: ['a'] });

  //     const usersQuery = request.get.withArgs(sinon.match({ url: 'http://admin:pass@localhost:5984/_users' }));
  //     usersQuery.rejects();
  //     usersQuery.onCall(3).resolves();
  //     request.get.withArgs(sinon.match({ url: 'http://admin:pass@localhost:5984/_replicator' })).resolves();
  //     request.get.withArgs(sinon.match({ url: 'http://admin:pass@localhost:5984/_global_changes' })).resolves();

  //     http.get.callsArgWith(1, { statusCode: 401 });

  //     const promise = service.check('http://admin:pass@localhost:5984/medic');
  //     Array.from({ length: 100 }).map(() => originalSetTimeout(() => clock.tick(1000)));
  //     await promise;

  //     chai.expect(request.get.callCount).to.equal(23);
  //     chai.expect(http.get.callCount).to.deep.equal(5);
  //   });

  //   it('invalid couchdb version', async () => {
  //     process = {
  //       versions: { node: '16.11.1' },
  //       env: { NODE_OPTIONS: { }},
  //       exit: sinon.stub(),
  //     };
  //     sinon.stub(http, 'get').callsArgWith(1, { statusCode: 401 });
  //     sinon.stub(request, 'get').rejects({ an: 'error' });
  //     request.get.withArgs(sinon.match({ url: 'http://admin:pass@localhost:5984/' })).onCall(100).resolves({ version: '3.3.3' });
  //     request.get.withArgs(sinon.match({ url: 'http://admin:pass@localhost:5984/_membership' })).resolves({
  //       cluster_nodes: ['1', '2'],
  //       all_nodes: ['1', '2'],
  //     });
  //     request.get.withArgs(sinon.match({ url: 'http://admin:pass@localhost:5984/_users' })).resolves();
  //     request.get.withArgs(sinon.match({ url: 'http://admin:pass@localhost:5984/_replicator' })).resolves();
  //     request.get.withArgs(sinon.match({ url: 'http://admin:pass@localhost:5984/_global_changes' })).resolves();

  //     const promise = service.check('http://admin:pass@localhost:5984/medic');
  //     // request will be retried 100 times
  //     Array.from({ length: 100 }).map(() => originalSetTimeout(() => clock.tick(1000)));
  //     await promise;
  //     chai.expect(request.get.callCount).to.equal(107);
  //   });

  //   it('couchdb in admin party', async () => {
  //     process = {
  //       versions: { node: '16.11.1' },
  //       env: { NODE_OPTIONS: { }},
  //       exit: sinon.stub(),
  //     };
  //     sinon.stub(http, 'get').callsArgWith(1, { statusCode: 200 });
  //     http.get.onCall(300).callsArgWith(1, { statusCode: 401 });
  //     sinon.stub(request, 'get');
  //     request.get.withArgs(sinon.match({ url: 'http://admin:pass@localhost:5984/' })).resolves({ version: '3.3.3' });
  //     request.get.withArgs(sinon.match({ url: 'http://admin:pass@localhost:5984/_membership' })).resolves({
  //       cluster_nodes: ['1', '2'],
  //       all_nodes: ['1', '2'],
  //     });
  //     request.get.withArgs(sinon.match({ url: 'http://admin:pass@localhost:5984/_users' })).resolves();
  //     request.get.withArgs(sinon.match({ url: 'http://admin:pass@localhost:5984/_replicator' })).resolves();
  //     request.get.withArgs(sinon.match({ url: 'http://admin:pass@localhost:5984/_global_changes' })).resolves();

  //     const promise = service.check('http://admin:pass@localhost:5984/medic');
  //     Array.from({ length: 300 }).map(() => originalSetTimeout(() => clock.tick(1000)));
  //     await promise;
  //     chai.expect(request.get.callCount).to.equal(307);
  //   });

  //   it('invalid server', () => {
  //     process = {
  //       versions: { node: '16.11.1' },
  //       env: { NODE_OPTIONS: { }},
  //       exit: sinon.stub(),
  //     };
  //     sinon.stub(http, 'get').callsArgWith(1, { statusCode: 401 });
  //     sinon.stub(request, 'get').resolves({ version: '3.3.3' });
  //     return service
  //       .check()
  //       .then(() => chai.expect.fail('Should have thrown'))
  //       .catch(err => {
  //         chai.assert.include(err.message, 'Environment variable "COUCH_URL" is required');
  //       });
  //   });

  //   it('too many segments', () => {
  //     process = {
  //       versions: { node: '16.11.1' },
  //       env: { NODE_OPTIONS: { }},
  //       exit: sinon.stub(),
  //     };
  //     sinon.stub(http, 'get').callsArgWith(1, { statusCode: 401 });
  //     sinon.stub(request, 'get').resolves({ version: '3.3.3' });
  //     return service
  //       .check('http://admin:pass@localhost:5984/path/to/db')
  //       .then(() => chai.assert.fail('should have thrown'))
  //       .catch(err => {
  //         chai.assert.include(err.message, 'Environment variable "COUCH_URL" must have only one path segment');
  //       });
  //   });

  //   it('unsupported version should throw', () => {
  //     process = {
  //       versions: { node: '16.11.1' },
  //       env: { NODE_OPTIONS: { }},
  //       exit: sinon.stub(),
  //     };
  //     sinon.stub(http, 'get').callsArgWith(1, { statusCode: 401 });
  //     sinon.stub(request, 'get');
  //     request.get.withArgs(sinon.match({ url: 'http://admin:pass@localhost:5984/' })).resolves({ version: '2.4.1' });
  //     return service
  //       .check('http://admin:pass@localhost:5984/path/to/db')
  //       .then(() => chai.assert.fail('should have thrown'))
  //       .catch(err => {
  //         chai.assert.include(err.message, 'Environment variable "COUCH_URL" must have only one path segment');
  //       });
  //   });

  // });

  // describe('getCouchDbVersion', () => {
  //   it('valid version should be logged', async () => {
  //     sinon.stub(request, 'get').resolves({ version: '3.3.3' });
  //     const version = await service.getCouchDbVersion('someURL');
  //     chai.expect(version).to.equal('3.3.3');
  //     chai.expect(request.get.callCount).to.equal(1);
  //     chai.expect(request.get.args[0][0]).to.deep.equal({ url: 'someURL', json: true });
  //   });

  //   it('should reject errors', () => {
  //     sinon.stub(request, 'get').rejects({ some: 'err' });
  //     return service
  //       .getCouchDbVersion('someOtherURL')
  //       .then(() => chai.expect.fail('Should have thrown'))
  //       .catch(err => {
  //         chai.expect(err).to.deep.equal({ some: 'err' });
  //         chai.expect(request.get.callCount).to.equal(1);
  //         chai.expect(request.get.args[0][0]).to.deep.equal({ url: 'someOtherURL', json: true });
  //       });
  //   });
  // });
});
