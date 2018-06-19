const sinon = require('sinon').sandbox.create();
require('chai').should();
const controller = require('../../../src/controllers/bulk-get');
const service = require('../../../src/services/bulk-get');

const testReq = {
  body: {
    docs: []
  }
};
const testRes = {};

describe('Bulk GET controller', () => {
  beforeEach(() => {
    sinon.stub(service, 'filterOfflineRequest').resolves();
  });

  afterEach(() => {
    sinon.restore();
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
