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
    sinon.stub(replicationFailureLogService, 'getByMonth');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should return error when not authenticated', async () => {
    auth.getUserCtx.rejects({ some: 'err' });

    await replicationFailureLogController.get(req, res);

    expect(res.json.callCount).to.equal(0);
    expect(replicationFailureLogService.getByMonth.callCount).to.equal(0);
    expect(serverUtils.error.callCount).to.equal(1);
    expect(serverUtils.error.args[0]).to.deep.equal([{ some: 'err' }, req, res, true]);
  });

  it('should return error when user is not an admin', async () => {
    auth.getUserCtx.resolves({ roles: ['district_admin'] });

    await replicationFailureLogController.get(req, res);

    expect(res.json.callCount).to.equal(0);
    expect(replicationFailureLogService.getByMonth.callCount).to.equal(0);
    expect(serverUtils.error.callCount).to.equal(1);
    expect(serverUtils.error.args[0][0]).to.deep.equal({ code: 401, message: 'User is not an admin' });
  });

  it('should use current month when no month param provided', async () => {
    const currentMonth = moment().format('YYYY-MM');
    auth.getUserCtx.resolves({ roles: [COUCHDB_ADMIN] });
    replicationFailureLogService.getByMonth.resolves([]);

    await replicationFailureLogController.get(req, res);

    expect(replicationFailureLogService.getByMonth.callCount).to.equal(1);
    expect(replicationFailureLogService.getByMonth.args[0][0]).to.equal(currentMonth);
    expect(res.json.callCount).to.equal(1);
    expect(res.json.args[0][0]).to.deep.equal({ month: currentMonth, logs: [] });
  });

  it('should use provided month param', async () => {
    req.query.month = '2025-11';
    auth.getUserCtx.resolves({ roles: [COUCHDB_ADMIN] });
    const logs = [{ _id: 'replication-fail-2025-11-bob', user: 'bob', failures: [] }];
    replicationFailureLogService.getByMonth.resolves(logs);

    await replicationFailureLogController.get(req, res);

    expect(replicationFailureLogService.getByMonth.callCount).to.equal(1);
    expect(replicationFailureLogService.getByMonth.args[0][0]).to.equal('2025-11');
    expect(res.json.callCount).to.equal(1);
    expect(res.json.args[0][0]).to.deep.equal({ month: '2025-11', logs });
  });

  it('should return error when service throws', async () => {
    auth.getUserCtx.resolves({ roles: [COUCHDB_ADMIN] });
    replicationFailureLogService.getByMonth.rejects({ status: 500 });

    await replicationFailureLogController.get(req, res);

    expect(res.json.callCount).to.equal(0);
    expect(serverUtils.error.callCount).to.equal(1);
    expect(serverUtils.error.args[0][0]).to.deep.equal({ status: 500 });
  });
});
