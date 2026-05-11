const sinon = require('sinon');
const moment = require('moment');
const auth = require('../../../src/auth');
const serverUtils = require('../../../src/server-utils');
const replicationFailureLogController = require('../../../src/controllers/replication-failure-log');
const replicationFailureLogService = require('../../../src/services/replication/replication-failure-log');
const pagination = require('../../../src/services/pagination');
const { USER_ROLES: { COUCHDB_ADMIN } } = require('@medic/constants');

describe('Replication Failure Log Controller', () => {
  let req;
  let res;

  beforeEach(() => {
    req = { query: {} };
    res = { json: sinon.stub() };
    sinon.stub(auth, 'getUserCtx');
    sinon.stub(serverUtils, 'error');
    sinon.stub(replicationFailureLogService, 'get');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should return error when not authenticated', async () => {
    auth.getUserCtx.rejects({ some: 'err' });

    await replicationFailureLogController.get(req, res);

    expect(res.json.callCount).to.equal(0);
    expect(replicationFailureLogService.get.callCount).to.equal(0);
    expect(serverUtils.error.callCount).to.equal(1);
    expect(serverUtils.error.args[0]).to.deep.equal([{ some: 'err' }, req, res, true]);
  });

  it('should return error when user is not an admin', async () => {
    auth.getUserCtx.resolves({ roles: ['district_admin'] });

    await replicationFailureLogController.get(req, res);

    expect(res.json.callCount).to.equal(0);
    expect(replicationFailureLogService.get.callCount).to.equal(0);
    expect(serverUtils.error.callCount).to.equal(1);
    const error = serverUtils.error.args[0][0];
    expect(error.message).to.equal('User is not an admin');
    expect(error.code).to.equal(401);
  });

  it('should default reporting_period to the current month when no user or period is provided', async () => {
    const currentPeriod = moment().format('YYYY-MM');
    auth.getUserCtx.resolves({ roles: [COUCHDB_ADMIN] });
    replicationFailureLogService.get.resolves({ data: [], cursor: null });

    await replicationFailureLogController.get(req, res);

    expect(replicationFailureLogService.get.callCount).to.equal(1);
    expect(replicationFailureLogService.get.args[0][0]).to.deep.equal({
      user: undefined,
      reportingPeriod: currentPeriod,
      cursor: 0,
      limit: pagination.DEFAULT_LIMIT,
    });
    expect(res.json.callCount).to.equal(1);
    expect(res.json.args[0][0]).to.deep.equal({ data: [], cursor: null });
  });

  it('should not default reporting_period when a user is provided (returns all periods for that user)', async () => {
    req.query.user = 'bob';
    auth.getUserCtx.resolves({ roles: [COUCHDB_ADMIN] });
    replicationFailureLogService.get.resolves({ data: [], cursor: null });

    await replicationFailureLogController.get(req, res);

    expect(replicationFailureLogService.get.args[0][0]).to.deep.equal({
      user: 'bob',
      reportingPeriod: undefined,
      cursor: 0,
      limit: pagination.DEFAULT_LIMIT,
    });
  });

  it('should honor an explicitly-provided reporting_period without overriding it', async () => {
    req.query.reporting_period = '2025-11';
    auth.getUserCtx.resolves({ roles: [COUCHDB_ADMIN] });
    replicationFailureLogService.get.resolves({ data: [], cursor: null });

    await replicationFailureLogController.get(req, res);

    expect(replicationFailureLogService.get.args[0][0].reportingPeriod).to.equal('2025-11');
  });

  it('should validate cursor and limit before calling the service', async () => {
    req.query.user = 'bob';
    req.query.reporting_period = '2025-11';
    req.query.cursor = '10';
    req.query.limit = '50';
    auth.getUserCtx.resolves({ roles: [COUCHDB_ADMIN] });
    const serviceResult = {
      data: [{ _id: 'replication-fail-2025-11-bob', user: 'bob', failures: [] }],
      cursor: '11',
    };
    replicationFailureLogService.get.resolves(serviceResult);

    await replicationFailureLogController.get(req, res);

    expect(replicationFailureLogService.get.callCount).to.equal(1);
    expect(replicationFailureLogService.get.args[0][0]).to.deep.equal({
      user: 'bob',
      reportingPeriod: '2025-11',
      cursor: 10,
      limit: 50,
    });
    expect(res.json.callCount).to.equal(1);
    expect(res.json.args[0][0]).to.deep.equal(serviceResult);
  });

  it('should respond 400 when the cursor is invalid', async () => {
    req.query.cursor = 'not-a-number';
    auth.getUserCtx.resolves({ roles: [COUCHDB_ADMIN] });

    await replicationFailureLogController.get(req, res);

    expect(replicationFailureLogService.get.callCount).to.equal(0);
    expect(serverUtils.error.callCount).to.equal(1);
    expect(serverUtils.error.args[0][0].name).to.equal('InvalidArgumentError');
    expect(serverUtils.error.args[0][0].message).to.match(/cursor must be a non-negative integer/);
  });

  it('should respond 400 when the limit is invalid', async () => {
    req.query.limit = '-5';
    auth.getUserCtx.resolves({ roles: [COUCHDB_ADMIN] });

    await replicationFailureLogController.get(req, res);

    expect(replicationFailureLogService.get.callCount).to.equal(0);
    expect(serverUtils.error.callCount).to.equal(1);
    expect(serverUtils.error.args[0][0].name).to.equal('InvalidArgumentError');
    expect(serverUtils.error.args[0][0].message).to.match(/limit must be a positive integer/);
  });

  it('should return error when the service throws', async () => {
    auth.getUserCtx.resolves({ roles: [COUCHDB_ADMIN] });
    replicationFailureLogService.get.rejects({ status: 500 });

    await replicationFailureLogController.get(req, res);

    expect(res.json.callCount).to.equal(0);
    expect(serverUtils.error.callCount).to.equal(1);
    expect(serverUtils.error.args[0][0]).to.deep.equal({ status: 500 });
  });
});
