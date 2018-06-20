const sinon = require('sinon').sandbox.create();
require('chai').should();
const controller = require('../../../src/controllers/all-docs');
const service = require('../../../src/services/all-docs');

const testReq = { body: { docs: []}},
      testRes = { type: sinon.stub() };

describe('All Docs controller', () => {
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
          service.filterOfflineRequest.args[0].should.deep.equal([ testReq, testRes ]);
        });
    });
  });
});
