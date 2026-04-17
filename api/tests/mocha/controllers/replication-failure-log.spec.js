const sinon = require('sinon');
const moment = require('moment');
const auth = require('../../../src/auth');
const serverUtils = require('../../../src/server-utils');
const replicationFailureLogController = require('../../../src/controllers/replication-failure-log');
const replicationFailureLogService = require('../../../src/services/replication/replication-failure-log');
const { USER_ROLES: { COUCHDB_ADMIN } } = require('@medic/constants');

describe('Replication Failure Log Controller', () => {
  let req;
  let res;

  beforeEach(() => {
    req = { query: {} };
    res = { json: sinon.stub() };
    sinon.stub(auth, 'getUserCtx');
    sinon.stub(serverUtils, 'error');
    sinon.stub(replicationFailureLogService, 'getSummariesByMonth');
    sinon.stub(replicationFailureLogService, 'getForUserAndMonth');
    sinon.stub(replicationFailureLogService, 'getAllForUser');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should return error when not authenticated', async () => {
    auth.getUserCtx.rejects({ some: 'err' });

    await replicationFailureLogController.get(req, res);

    expect(res.json.callCount).to.equal(0);
    expect(replicationFailureLogService.getSummariesByMonth.callCount).to.equal(0);
    expect(replicationFailureLogService.getForUserAndMonth.callCount).to.equal(0);
    expect(serverUtils.error.callCount).to.equal(1);
    expect(serverUtils.error.args[0]).to.deep.equal([{ some: 'err' }, req, res, true]);
  });

  it('should return error when user is not an admin', async () => {
    auth.getUserCtx.resolves({ roles: ['district_admin'] });

    await replicationFailureLogController.get(req, res);

    expect(res.json.callCount).to.equal(0);
    expect(replicationFailureLogService.getSummariesByMonth.callCount).to.equal(0);
    expect(replicationFailureLogService.getForUserAndMonth.callCount).to.equal(0);
    expect(serverUtils.error.callCount).to.equal(1);
    const error = serverUtils.error.args[0][0];
    expect(error.message).to.equal('User is not an admin');
    expect(error.code).to.equal(401);
  });

  it('should return summaries for the current month when no params provided', async () => {
    const currentMonth = moment().format('YYYY-MM');
    auth.getUserCtx.resolves({ roles: [COUCHDB_ADMIN] });
    replicationFailureLogService.getSummariesByMonth.resolves([]);

    await replicationFailureLogController.get(req, res);

    expect(replicationFailureLogService.getSummariesByMonth.callCount).to.equal(1);
    expect(replicationFailureLogService.getSummariesByMonth.args[0][0]).to.equal(currentMonth);
    expect(replicationFailureLogService.getForUserAndMonth.callCount).to.equal(0);
    expect(res.json.callCount).to.equal(1);
    expect(res.json.args[0][0]).to.deep.equal({ month: currentMonth, logs: [] });
  });

  it('should return summaries for the provided month', async () => {
    req.query.month = '2025-11';
    auth.getUserCtx.resolves({ roles: [COUCHDB_ADMIN] });
    const summaries = [
      { _id: 'replication-fail-2025-11-bob', user: 'bob', timestamp: 1000, total_failures: 3 },
    ];
    replicationFailureLogService.getSummariesByMonth.resolves(summaries);

    await replicationFailureLogController.get(req, res);

    expect(replicationFailureLogService.getSummariesByMonth.callCount).to.equal(1);
    expect(replicationFailureLogService.getSummariesByMonth.args[0][0]).to.equal('2025-11');
    expect(replicationFailureLogService.getForUserAndMonth.callCount).to.equal(0);
    expect(res.json.callCount).to.equal(1);
    expect(res.json.args[0][0]).to.deep.equal({ month: '2025-11', logs: summaries });
  });

  it('should return the full log for a specific user when user param is provided', async () => {
    req.query.month = '2025-11';
    req.query.user = 'bob';
    auth.getUserCtx.resolves({ roles: [COUCHDB_ADMIN] });
    const log = {
      _id: 'replication-fail-2025-11-bob',
      user: 'bob',
      total_failures: 3,
      failures: [{ status_code: 500 }],
    };
    replicationFailureLogService.getForUserAndMonth.resolves(log);

    await replicationFailureLogController.get(req, res);

    expect(replicationFailureLogService.getForUserAndMonth.callCount).to.equal(1);
    expect(replicationFailureLogService.getForUserAndMonth.args[0]).to.deep.equal(['2025-11', 'bob']);
    expect(replicationFailureLogService.getSummariesByMonth.callCount).to.equal(0);
    expect(res.json.callCount).to.equal(1);
    expect(res.json.args[0][0]).to.deep.equal({ month: '2025-11', user: 'bob', log });
  });

  it('should return all logs for a user across months when user param is provided without month', async () => {
    req.query.user = 'bob';
    auth.getUserCtx.resolves({ roles: [COUCHDB_ADMIN] });
    const logs = [
      { _id: 'replication-fail-2025-11-bob', user: 'bob', failures: [] },
      { _id: 'replication-fail-2025-12-bob', user: 'bob', failures: [] },
    ];
    replicationFailureLogService.getAllForUser.resolves(logs);

    await replicationFailureLogController.get(req, res);

    expect(replicationFailureLogService.getAllForUser.callCount).to.equal(1);
    expect(replicationFailureLogService.getAllForUser.args[0]).to.deep.equal(['bob']);
    expect(replicationFailureLogService.getForUserAndMonth.callCount).to.equal(0);
    expect(replicationFailureLogService.getSummariesByMonth.callCount).to.equal(0);
    expect(res.json.callCount).to.equal(1);
    expect(res.json.args[0][0]).to.deep.equal({ user: 'bob', logs });
  });

  it('should return error when summaries service throws', async () => {
    auth.getUserCtx.resolves({ roles: [COUCHDB_ADMIN] });
    replicationFailureLogService.getSummariesByMonth.rejects({ status: 500 });

    await replicationFailureLogController.get(req, res);

    expect(res.json.callCount).to.equal(0);
    expect(serverUtils.error.callCount).to.equal(1);
    expect(serverUtils.error.args[0][0]).to.deep.equal({ status: 500 });
  });

  it('should return error when per-user-per-month service throws', async () => {
    req.query.user = 'bob';
    req.query.month = '2025-11';
    auth.getUserCtx.resolves({ roles: [COUCHDB_ADMIN] });
    replicationFailureLogService.getForUserAndMonth.rejects({ status: 500 });

    await replicationFailureLogController.get(req, res);

    expect(res.json.callCount).to.equal(0);
    expect(serverUtils.error.callCount).to.equal(1);
    expect(serverUtils.error.args[0][0]).to.deep.equal({ status: 500 });
  });

  it('should return error when all-for-user service throws', async () => {
    req.query.user = 'bob';
    auth.getUserCtx.resolves({ roles: [COUCHDB_ADMIN] });
    replicationFailureLogService.getAllForUser.rejects({ status: 500 });

    await replicationFailureLogController.get(req, res);

    expect(res.json.callCount).to.equal(0);
    expect(serverUtils.error.callCount).to.equal(1);
    expect(serverUtils.error.args[0][0]).to.deep.equal({ status: 500 });
  });
});
