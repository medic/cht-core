const chai = require('chai');
const sinon = require('sinon');
const auth = require('../../../src/auth');
const middleware = require('../../../src/middleware/connected-user-log');
const connectedUserLogService = require('../../../src/services/connected-user-log');

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
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('log', () => {
    it('should call the connectedUserLogService with the right param', () => {
      auth.getUserCtx.resolves({ name: 'admin' });
      return middleware
        .log(req, res, next)
        .then(() => {
          chai.expect(auth.getUserCtx.callCount).to.equal(1);
          chai.expect(connectedUserLogService.save.callCount).to.equal(1);
          chai.expect(connectedUserLogService.save.args[0][0]).to.equal('admin');
          chai.expect(next.callCount).to.equal(1);
        });
    });
  });
});
