const sinon = require('sinon');
require('chai').should();
const controller = require('../../../src/controllers/bulk-get');
const service = require('../../../src/services/bulk-get');
const serverUtils = require('../../../src/server-utils');

let testReq;
let testRes;

describe('Bulk GET controller', () => {
  beforeEach(() => {
    testReq = { body: { docs: [] } };
    testRes = {
      json: sinon.stub(),
      status: sinon.stub()
    };
    sinon.stub(service, 'filterOfflineRequest').resolves();
    sinon.stub(serverUtils, 'serverError');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('request', () => {
    it('filters offline requests', () => {
      service.filterOfflineRequest.resolves(['a', 'b', 'c']);
      return controller
        .request(testReq, testRes)
        .then(() => {
          service.filterOfflineRequest.callCount.should.equal(1);
          service.filterOfflineRequest.args[0].should.deep.equal([ testReq.userCtx, testReq.query, testReq.body.docs ]);
          testRes.json.callCount.should.equal(1);
          testRes.json.args[0].should.deep.equal([['a', 'b', 'c']]);
        });
    });

    describe('invalidRequest', () => {
      it('returns error when body is not set', () => {
        controller._invalidRequest(false).should.deep.equal({ error: 'bad_request', reason: 'invalid UTF-8 JSON' });
      });

      it('returns error when body is missing `docs` property', () => {
        controller._invalidRequest({ body: {} }).should.deep.equal(
          { error: 'bad_request', reason: 'Missing JSON list of `docs`.' });
      });

      it('returns error when `docs` is not an array', () => {
        controller._invalidRequest({ body: { docs: 'alpha' } }).should.deep.equal(
          { error: 'bad_request', reason: '`docs` parameter must be an array.' });
      });
    });

    it('catches service errors', () => {
      testReq.body = { docs: [] };
      service.filterOfflineRequest.rejects({ error: 'something' });

      return controller
        .request(testReq, testRes)
        .catch(() => {
          serverUtils.serverError.callCount.should.equal(1);
          serverUtils.serverError.args[0][0].should.deep.equal({ error: 'something' });
        });
    });

    it('handles requests without a body', () => {
      testReq.body = null;

      return Promise
        .all([
          controller.request(testReq, testRes),
          Promise.resolve()
        ]).then(() => {
          service.filterOfflineRequest.callCount.should.equal(0);
          testRes.json.callCount.should.equal(1);
          testRes.status.callCount.should.equal(1);
          testRes.status.args[0][0].should.equal(400);
          testRes.json.args[0][0].error.should.equal('bad_request');
        });
    });

    it('handles requests without `docs` parameter', () => {
      testReq.body = { some: 'thing' };

      return Promise
        .all([
          controller.request(testReq, testRes),
          Promise.resolve()
        ]).then(() => {
          service.filterOfflineRequest.callCount.should.equal(0);
          testRes.json.callCount.should.equal(1);
          testRes.status.callCount.should.equal(1);
          testRes.status.args[0][0].should.equal(400);
          testRes.json.args[0][0].error.should.equal('bad_request');
        });
    });

    it('handles requests when `docs` parameter is not an array', () => {
      testReq.body = { docs: 'something' };

      return Promise
        .all([
          controller.request(testReq, testRes),
          Promise.resolve()
        ]).then(() => {
          service.filterOfflineRequest.callCount.should.equal(0);
          testRes.json.callCount.should.equal(1);
          testRes.status.callCount.should.equal(1);
          testRes.status.args[0][0].should.equal(400);
          testRes.json.args[0][0].error.should.equal('bad_request');
        });
    });

  });
});
