const sinon = require('sinon');
const auth = require('../../../src/auth');
const serverUtils = require('../../../src/server-utils');
const controller = require('../../../src/controllers/users-without-replication');
const service = require('../../../src/services/replication/users-without-replication');
const { USER_ROLES: { COUCHDB_ADMIN } } = require('@medic/constants');

describe('Users Without Replication Controller', () => {
  let req;
  let res;

  beforeEach(() => {
    req = { query: {} };
    res = { json: sinon.stub() };
    sinon.stub(auth, 'getUserCtx');
    sinon.stub(serverUtils, 'error');
    sinon.stub(service, 'get');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should return error when not authenticated', async () => {
    auth.getUserCtx.rejects({ some: 'err' });

    await controller.get(req, res);

    expect(res.json.callCount).to.equal(0);
    expect(service.get.callCount).to.equal(0);
    expect(serverUtils.error.callCount).to.equal(1);
    expect(serverUtils.error.args[0]).to.deep.equal([{ some: 'err' }, req, res, true]);
  });

  it('should return error when user is not an admin', async () => {
    auth.getUserCtx.resolves({ roles: ['district_admin'] });

    await controller.get(req, res);

    expect(res.json.callCount).to.equal(0);
    expect(service.get.callCount).to.equal(0);
    expect(serverUtils.error.callCount).to.equal(1);
    const error = serverUtils.error.args[0][0];
    expect(error.message).to.equal('User is not an admin');
    expect(error.code).to.equal(401);
  });

  it('should return the service result for an admin with no query params', async () => {
    auth.getUserCtx.resolves({ roles: [COUCHDB_ADMIN] });
    const result = { users: [{ user: 'alice', last_replication_date: 1, failures_since_last_replication: 3 }] };
    service.get.resolves(result);

    await controller.get(req, res);

    expect(service.get.callCount).to.equal(1);
    expect(service.get.args[0][0]).to.deep.equal({ minFailures: undefined });
    expect(res.json.callCount).to.equal(1);
    expect(res.json.args[0][0]).to.deep.equal(result);
  });

  it('should pass a parsed min_failures to the service', async () => {
    req.query.min_failures = '5';
    auth.getUserCtx.resolves({ roles: [COUCHDB_ADMIN] });
    service.get.resolves({ users: [] });

    await controller.get(req, res);

    expect(service.get.args[0][0]).to.deep.equal({ minFailures: 5 });
  });

  it('should reject an invalid min_failures with a 400', async () => {
    req.query.min_failures = 'not-a-number';
    auth.getUserCtx.resolves({ roles: [COUCHDB_ADMIN] });

    await controller.get(req, res);

    expect(service.get.callCount).to.equal(0);
    expect(res.json.callCount).to.equal(0);
    expect(serverUtils.error.callCount).to.equal(1);
    const error = serverUtils.error.args[0][0];
    expect(error.name).to.equal('InvalidArgumentError');
  });

  it('should reject a min_failures below 1 with a 400', async () => {
    req.query.min_failures = '0';
    auth.getUserCtx.resolves({ roles: [COUCHDB_ADMIN] });

    await controller.get(req, res);

    expect(service.get.callCount).to.equal(0);
    expect(serverUtils.error.args[0][0].name).to.equal('InvalidArgumentError');
  });
});
