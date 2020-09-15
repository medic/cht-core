const chai = require('chai');
const sinon = require('sinon');
const auth = require('../../../src/auth');
const serverUtils = require('../../../src/server-utils');
const replicationLimitLogController = require('../../../src/controllers/replication-limit-log');
const replicationLimitLogService = require('../../../src/services/replication-limit-log');

describe('Replication Limit Log Controller', () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      query: { user: 'userXYZ' }
    };
    res = { json: sinon.stub() };
    sinon.stub(auth, 'getUserCtx');
    sinon.stub(serverUtils, 'error');
    sinon.stub(replicationLimitLogService, 'get');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('getReplicationLimitLog', () => {
    it('should throw an error when not authenticated', () => {
      auth.getUserCtx.rejects({ some: 'err' });

      return replicationLimitLogController
        .get(req, res)
        .then(() => {
          chai.expect(auth.getUserCtx.callCount).to.equal(1);
          chai.expect(auth.getUserCtx.args[0]).to.deep.equal([req]);
          chai.expect(res.json.callCount).to.equal(0);
          chai.expect(replicationLimitLogService.get.callCount).to.equal(0);
          chai.expect(serverUtils.error.callCount).to.equal(1);
          chai.expect(serverUtils.error.args[0]).to.deep.equal([{ some: 'err' }, req, res, true]);
        });
    });

    it('should throw an error when it is not admin user', () => {
      auth.getUserCtx.resolves({ roles: ['other'] });
      const error = {
        code: 401,
        message: 'User is not an admin'
      };

      return replicationLimitLogController
        .get(req, res)
        .then(() => {
          chai.expect(auth.getUserCtx.callCount).to.equal(1);
          chai.expect(auth.getUserCtx.args[0]).to.deep.equal([req]);
          chai.expect(res.json.callCount).to.equal(0);
          chai.expect(replicationLimitLogService.get.callCount).to.equal(0);
          chai.expect(serverUtils.error.callCount).to.equal(1);
          chai.expect(serverUtils.error.args[0]).to.deep.equal([error, req, res, true]);
        });
    });

    it('should respond with a log document', () => {
      auth.getUserCtx.resolves({ roles: ['_admin'] });
      replicationLimitLogService.get.resolves({ some: 'logs' });

      return replicationLimitLogController
        .get(req, res)
        .then(() => {
          chai.expect(auth.getUserCtx.callCount).to.equal(1);
          chai.expect(auth.getUserCtx.args[0][0]).to.deep.equal(req);
          chai.expect(serverUtils.error.callCount).to.equal(0);
          chai.expect(replicationLimitLogService.get.callCount).to.equal(1);
          chai.expect(res.json.callCount).to.equal(1);
          chai.expect(res.json.args[0][0]).to.deep.equal({ some: 'logs' });
        });
    });
  });
});
