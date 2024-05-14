const chai = require('chai');
const sinon = require('sinon');
const auth = require('../../../src/auth');
const middleware = require('../../../src/middleware/connected-user-log');
const connectedUserLogService = require('../../../src/services/connected-user-log');
const logger = require('@medic/logger');

let req;
let res;
let next;

describe('Connected Users Log middleware', () => {
  beforeEach(() => {
    req = {};
    res = {};
    next = sinon.stub();
    sinon.stub(auth, 'getUserCtx');
    sinon.stub(connectedUserLogService, 'save');
    sinon.stub(logger, 'error');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('log', () => {
    it('should call the connectedUserLogService with the right param', () => {
      auth.getUserCtx.resolves({ name: 'admin' });
      connectedUserLogService.save.resolves();
      return middleware
        .log(req, res, next)
        .then(() => {
          chai.expect(auth.getUserCtx.callCount).to.equal(1);
          chai.expect(connectedUserLogService.save.callCount).to.equal(1);
          chai.expect(connectedUserLogService.save.args[0][0]).to.equal('admin');
          chai.expect(next.callCount).to.equal(1);
        });
    });

    it('should call next with no params even connectedUserLogService rejects', () => {
      auth.getUserCtx.resolves({ name: 'admin' });
      connectedUserLogService.save.rejects();
      return middleware
        .log(req, res, next)
        .then(() => {
          chai.expect(next.callCount).to.equal(1);
          chai.expect(next.args[0]).to.be.empty;
          chai.expect(logger.error.callCount).to.equal(1);
          chai.expect(logger.error.args[0][0]).to.equal('Error recording user connection:');
        });
    });
  });
});
