const sinon = require('sinon');
const auth = require('../../../src/auth');
const serverUtils = require('../../../src/server-utils');
const controller = require('../../../src/controllers/replication-health');
const service = require('../../../src/services/replication/replication-health');
const { USER_ROLES: { COUCHDB_ADMIN } } = require('@medic/constants');

describe('Replication Health Controller', () => {
  let req;
  let res;

  beforeEach(() => {
    req = { query: {} };
    res = { json: sinon.stub() };
    sinon.stub(auth, 'getUserCtx');
    sinon.stub(serverUtils, 'error');
    sinon.stub(service, 'getFailed');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('failed', () => {
    it('should return error when not authenticated', async () => {
      auth.getUserCtx.rejects({ some: 'err' });

      await controller.failed(req, res);

      expect(res.json.callCount).to.equal(0);
      expect(service.getFailed.callCount).to.equal(0);
      expect(serverUtils.error.callCount).to.equal(1);
      expect(serverUtils.error.args[0]).to.deep.equal([{ some: 'err' }, req, res, true]);
    });

    it('should return error when user is not an admin', async () => {
      auth.getUserCtx.resolves({ roles: ['district_admin'] });

      await controller.failed(req, res);

      expect(res.json.callCount).to.equal(0);
      expect(service.getFailed.callCount).to.equal(0);
      expect(serverUtils.error.callCount).to.equal(1);
      const error = serverUtils.error.args[0][0];
      expect(error.message).to.equal('User is not an admin');
      expect(error.code).to.equal(403);
    });

    it('should return the service result for an admin with no query params', async () => {
      auth.getUserCtx.resolves({ roles: [COUCHDB_ADMIN] });
      const result = { users: [{ user: 'alice', last_replication_date: 1, failures_since_last_replication: 3 }] };
      service.getFailed.resolves(result);

      await controller.failed(req, res);

      expect(service.getFailed.callCount).to.equal(1);
      expect(service.getFailed.args[0][0]).to.deep.equal({ days: undefined, minFailures: undefined });
      expect(res.json.callCount).to.equal(1);
      expect(res.json.args[0][0]).to.deep.equal(result);
    });

    it('should pass parsed days and min_failures to the service', async () => {
      req.query.days = '30';
      req.query.min_failures = '5';
      auth.getUserCtx.resolves({ roles: [COUCHDB_ADMIN] });
      service.getFailed.resolves({ users: [] });

      await controller.failed(req, res);

      expect(service.getFailed.args[0][0]).to.deep.equal({ days: 30, minFailures: 5 });
    });

    it('should reject an invalid days with a 400', async () => {
      req.query.days = 'not-a-number';
      auth.getUserCtx.resolves({ roles: [COUCHDB_ADMIN] });

      await controller.failed(req, res);

      expect(service.getFailed.callCount).to.equal(0);
      expect(serverUtils.error.args[0][0].name).to.equal('InvalidArgumentError');
    });

    it('should reject an invalid min_failures with a 400', async () => {
      req.query.min_failures = 'not-a-number';
      auth.getUserCtx.resolves({ roles: [COUCHDB_ADMIN] });

      await controller.failed(req, res);

      expect(service.getFailed.callCount).to.equal(0);
      expect(res.json.callCount).to.equal(0);
      expect(serverUtils.error.callCount).to.equal(1);
      expect(serverUtils.error.args[0][0].name).to.equal('InvalidArgumentError');
    });

    it('should reject a min_failures below 1 with a 400', async () => {
      req.query.min_failures = '0';
      auth.getUserCtx.resolves({ roles: [COUCHDB_ADMIN] });

      await controller.failed(req, res);

      expect(service.getFailed.callCount).to.equal(0);
      expect(serverUtils.error.args[0][0].name).to.equal('InvalidArgumentError');
    });
  });
});
