const sinon = require('sinon').sandbox.create();
const auth = require('../../../src/auth');
require('chai').should();
const controller = require('../../../src/controllers/bulk-docs');
const service = require('../../../src/services/bulk-docs');

const testReq = {
  body: {
    docs: []
  }
};
const testRes = {};

describe('Bulk Docs controller', () => {
  beforeEach(() => {
    sinon.stub(auth, 'getUserCtx');
    sinon.stub(auth, 'isOnlineOnly');
    sinon.stub(service, 'bulkDelete');
    sinon.stub(service, 'filterOfflineRequest').resolves();
  });

  afterEach(() => {
    sinon.restore();
  });

  it('checks that user is an admin', () => {
    const userCtx = {};
    auth.getUserCtx.resolves(userCtx);
    auth.isOnlineOnly.withArgs(userCtx).returns(false);
    const next = sinon.stub();
    return controller.bulkDelete(testReq, testRes, next)
      .then(() => {
        auth.getUserCtx.callCount.should.equal(1);
        auth.isOnlineOnly.callCount.should.equal(1);
        next.callCount.should.equal(1);
        next.getCall(0).args[0].code.should.equal(401);
      });
  });

  describe('request', () => {
    it ('filters for offline requests', () => {
      return controller
        .request(testReq, testRes)
        .then(() => {
          service.filterOfflineRequest.callCount.should.equal(1);
          service.filterOfflineRequest.getCall(0).args[0].should.equal(testReq);
          service.filterOfflineRequest.getCall(0).args[1].should.equal(testRes);
        });
    });
  });
});
