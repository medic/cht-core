const chai = require('chai');
const sinon = require('sinon');
const auth = require('../../../src/auth');
const serverUtils = require('../../../src/server-utils');
const connectedUserLogController = require('../../../src/controllers/connected-user-log');
const connectedUserLogService = require('../../../src/services/connected-user-log');

describe.only('Connected Users Log Controller', () => {
  let req;
  let res;

  beforeEach(() => {
    req = { query: {} };
    res = { json: sinon.stub() };
    sinon.stub(auth, 'getUserCtx');
    sinon.stub(serverUtils, 'error');
    sinon.stub(connectedUserLogService, 'get');
    sinon.stub(connectedUserLogService, 'save');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('get', () => {
    it('should throw an error when not authenticated', () => {
      auth.getUserCtx.rejects({ some: 'err' });
  
      return connectedUserLogController
        .get(req, res)
        .then(() => {
          chai.expect(auth.getUserCtx.callCount).to.equal(1);
          chai.expect(auth.getUserCtx.args[0]).to.deep.equal([req]);
          chai.expect(res.json.callCount).to.equal(0);
          chai.expect(connectedUserLogService.get.callCount).to.equal(0);
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
  
      return connectedUserLogController
        .get(req, res)
        .then(() => {
          chai.expect(auth.getUserCtx.callCount).to.equal(1);
          chai.expect(auth.getUserCtx.args[0]).to.deep.equal([req]);
          chai.expect(res.json.callCount).to.equal(0);
          chai.expect(connectedUserLogService.get.callCount).to.equal(0);
          chai.expect(serverUtils.error.callCount).to.equal(1);
          chai.expect(serverUtils.error.args[0]).to.deep.equal([error, req, res, true]);
        });
    });

    it('should default to a 7 day interval if no interval is provided in query', () => {
      auth.getUserCtx.resolves({ roles: ['_admin'] });
      connectedUserLogService.get.resolves({ some: 'logs' });

      return connectedUserLogController
        .get(req, res)
        .then(() => {
          chai.expect(auth.getUserCtx.callCount).to.equal(1);
          chai.expect(auth.getUserCtx.args[0][0]).to.deep.equal(req);
          chai.expect(serverUtils.error.callCount).to.equal(0);
          chai.expect(connectedUserLogService.get.callCount).to.equal(1);
          chai.expect(connectedUserLogService.get.args[0][0]).to.equal(7);
          chai.expect(res.json.callCount).to.equal(1);
          chai.expect(res.json.args[0][0]).to.deep.equal({ some: 'logs' });
        });
    });

    it('should use the interval provided in the query', () => {
      req = { query: { interval: 14 } };
      auth.getUserCtx.resolves({ roles: ['_admin'] });
      connectedUserLogService.get.resolves({ some: 'logs' });

      return connectedUserLogController
        .get(req, res)
        .then(() => {
          chai.expect(auth.getUserCtx.callCount).to.equal(1);
          chai.expect(auth.getUserCtx.args[0][0]).to.deep.equal(req);
          chai.expect(serverUtils.error.callCount).to.equal(0);
          chai.expect(connectedUserLogService.get.callCount).to.equal(1);
          chai.expect(connectedUserLogService.get.args[0][0]).to.equal(14);
          chai.expect(res.json.callCount).to.equal(1);
          chai.expect(res.json.args[0][0]).to.deep.equal({ some: 'logs' });
        });
    });
  });

  describe('log', () => {
    it('should call the connectedUserLogService with the right param', () => {
      auth.getUserCtx.resolves({ name: 'admin' });
      return connectedUserLogController
        .log(req)
        .then(() => {
          chai.expect(auth.getUserCtx.callCount).to.equal(1);
          chai.expect(connectedUserLogService.save.callCount).to.equal(1);
          chai.expect(connectedUserLogService.save.args[0][0]).to.have.keys(['user', 'timestamp']);
          chai.expect(connectedUserLogService.save.args[0][0].user).to.equal('admin');
        });
    });
  });
});
