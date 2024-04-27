const chai = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');

const checks = require('../src/checks');

const VALID_URL = 'http://admin:pass@localhost/medic';

let originalProcess;
let originalSetTimeout;
let service;
let clock;

describe('entry point', () => {

  beforeEach(() => {
    originalProcess = process;
    originalSetTimeout = setTimeout;
    clock = sinon.useFakeTimers();
    service = rewire('../src/index');
  });

  afterEach(() => {
    sinon.restore();
    clock.restore();
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

  it('throws server url errors', () => {
    sinon.stub(checks, 'checkNodeVersion').returns();
    sinon.stub(checks, 'checkServerUrl').throws('invalid server url');
    sinon.stub(process, 'exit');
    service.check(VALID_URL);
    chai.expect(process.exit.callCount).to.equal(1);
    chai.expect(process.exit.args[0][0]).to.equal(1);
  });

  it('retries couchdb errors', async () => {
    sinon.stub(console, 'error'); // swallow 100 log statements

    sinon.stub(checks, 'checkNodeVersion').returns();
    sinon.stub(checks, 'checkServerUrl').returns();
    const checkCouchDbVersion = sinon.stub(checks, 'checkCouchDbVersion');
    checkCouchDbVersion.throws(new Error('db not found'));
    checkCouchDbVersion.onCall(100).resolves();
    sinon.stub(checks, 'checkCouchDbNoAdminPartyMode').resolves();
    sinon.stub(checks, 'checkCouchDbCluster').resolves();
    sinon.stub(checks, 'checkCouchDbSystemDbs').resolves();

    const promise = service.check(VALID_URL);
    Array.from({ length: 100 }).map(() => originalSetTimeout(() => clock.tick(1000)));
    await promise;

    chai.expect(checks.checkNodeVersion.callCount).to.equal(1);
    chai.expect(checks.checkServerUrl.callCount).to.equal(1);
    chai.expect(checks.checkCouchDbVersion.callCount).to.equal(101);
    chai.expect(checks.checkCouchDbNoAdminPartyMode.callCount).to.equal(1);
    chai.expect(checks.checkCouchDbCluster.callCount).to.equal(1);
    chai.expect(checks.checkCouchDbSystemDbs.callCount).to.equal(1);

    /* eslint-disable no-console */
    chai.expect(console.error.callCount).to.equal(100);
    chai.expect(console.error.args[0][0].message).to.equal('db not found');
  });

});
