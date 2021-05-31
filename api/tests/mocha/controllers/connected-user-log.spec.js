const chai = require('chai');
const sinon = require('sinon');
const auth = require('../../../src/auth');
const serverUtils = require('../../../src/server-utils');
const connectedUserLogController = require('../../../src/middleware/connected-user-log');
const connectedUserLogService = require('../../../src/services/connected-user-log');

describe('Connected Users Log Controller', () => {
  let req;

  beforeEach(() => {
    req = { query: {} };
    sinon.stub(auth, 'getUserCtx');
    sinon.stub(serverUtils, 'error');
    sinon.stub(connectedUserLogService, 'get');
    sinon.stub(connectedUserLogService, 'save');
  });

  afterEach(() => {
    sinon.restore();
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
