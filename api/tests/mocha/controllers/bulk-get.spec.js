const sinon = require('sinon').sandbox.create();
require('chai').should();
const controller = require('../../../src/controllers/bulk-get');
const service = require('../../../src/services/bulk-get');

const testRes = { type: sinon.stub() },
      testReq = { body: { docs: [] } };

describe('Bulk GET controller', () => {
  beforeEach(() => {
    sinon.stub(service, 'filterOfflineRequest').resolves();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('request', () => {
    it ('filters offline requests', () => {
      return controller
        .request(testReq, testRes)
        .then(() => {
          service.filterOfflineRequest.callCount.should.equal(1);
          service.filterOfflineRequest.args[0].should.deep.equal([ testReq, testRes ]);
        });
    });
  });
});
