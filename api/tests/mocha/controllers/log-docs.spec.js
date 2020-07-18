const chai = require('chai');
const sinon = require('sinon');
const logDocsController = require('../../../src/controllers/log-docs');
const auth = require('../../../src/auth');
const serverUtils = require('../../../src/server-utils');
const logDocsService = require('../../../src/services/log-docs');

describe('Log Docs Controller', () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      query: { user: 'userXYZ' }
    };
    res = { json: sinon.stub() };
    sinon.stub(auth, 'getUserCtx');
    sinon.stub(serverUtils, 'error');
    sinon.stub(logDocsService, 'getReplicationLimitExceededLog');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('getReplicationLimitLog', () => {
    it('should throw an error when not authenticated', () => {
      auth.getUserCtx.rejects({ some: 'err' });

      return logDocsController
        .getReplicationLimitLog(req, res)
        .then(() => {
          chai.expect(auth.getUserCtx.callCount).to.equal(1);
          chai.expect(auth.getUserCtx.args[0]).to.deep.equal([req]);
          chai.expect(res.json.callCount).to.equal(0);
          chai.expect(logDocsService.getReplicationLimitExceededLog.callCount).to.equal(0);
          chai.expect(serverUtils.error.callCount).to.equal(1);
          chai.expect(serverUtils.error.args[0]).to.deep.equal([{ some: 'err' }, req, res, true]);
        });
    });

    it('should respond with a log document', () => {
      auth.getUserCtx.resolves(true);
      logDocsService.getReplicationLimitExceededLog.resolves({ some: 'logs' });

      return logDocsController
        .getReplicationLimitLog(req, res)
        .then(() => {
          chai.expect(auth.getUserCtx.callCount).to.equal(1);
          chai.expect(auth.getUserCtx.args[0][0]).to.deep.equal(req);
          chai.expect(serverUtils.error.callCount).to.equal(0);
          chai.expect(logDocsService.getReplicationLimitExceededLog.callCount).to.equal(1);
          chai.expect(res.json.callCount).to.equal(1);
          chai.expect(res.json.args[0][0]).to.deep.equal({ some: 'logs' });
        });
    });
  });
});
