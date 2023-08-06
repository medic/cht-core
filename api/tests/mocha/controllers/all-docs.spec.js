const sinon = require('sinon');
require('chai').should();
const controller = require('../../../src/controllers/all-docs');
const service = require('../../../src/services/all-docs');
const serverUtils = require('../../../src/server-utils');

let testReq;
let testRes;

describe('All Docs controller', () => {
  beforeEach(() => {
    testReq = { body: {}, query: {}};
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

  describe('invalidRequest', () => {
    it('returns error when request query `keys` is not JSON', () => {
      testReq.query.keys = 'abcd';
      controller._invalidRequest(testReq)
        .should.deep.equal({ error: 'bad_request', reason: '`keys` parameter must be an array.' });
    });

    it('returns error when request query `keys` is not an array', () => {
      testReq.query.keys = { some: 'thing' };
      controller._invalidRequest(testReq).should.deep.equal(
        { error: 'bad_request', reason: '`keys` parameter must be an array.' }
      );
    });

    it('returns error when request body `keys` is not an array array', () => {
      testReq.body = { keys: 'something' };
      testReq.method = 'POST';
      controller._invalidRequest(testReq).should.deep.equal(
        { error: 'bad_request', reason: '`keys` body member must be an array.' }
      );
    });

    it('returns false otherwise', () => {
      controller._invalidRequest({}).should.equal(false);
      controller._invalidRequest({query: { keys: [1, 2] }}).should.equal(false);
      controller._invalidRequest({body: { keys: [1, 2] }}).should.equal(false);
    });
  });


  describe('request', () => {
    it('catches service errors', () => {
      service.filterOfflineRequest.rejects({ some: 'error' });

      controller
        .request(testReq, testRes)
        .catch(() => {
          serverUtils.serverError.callCount.should.equal(1);
          serverUtils.serverError.args[0][0].should.deep.equal({ some: 'error' });
        });
    });

    it('filters for offline requests', () => {
      service.filterOfflineRequest.resolves(['a', 'b']);
      return controller
        .request(testReq, testRes)
        .then(() => {
          service.filterOfflineRequest.callCount.should.equal(1);
          service.filterOfflineRequest.args[0].should.deep.equal([ testReq.userCtx, testReq.query, testReq.body ]);
          testRes.json.callCount.should.equal(1);
          testRes.json.args[0].should.deep.equal([['a', 'b']]);
        });
    });

    it('handles POST requests with non-array `keys` body parameter', () => {
      testReq.method = 'POST';
      testReq.body = { keys: 'aaaaa' };

      return Promise
        .all([
          controller.request(testReq, testRes),
          Promise.resolve()
        ])
        .then(() => {
          service.filterOfflineRequest.callCount.should.equal(0);
          testRes.json.callCount.should.equal(1);
          testRes.status.callCount.should.equal(1);
          testRes.status.args[0][0].should.equal(400);
          testRes.json.args[0][0].error.should.equal('bad_request');
        });
    });

    it('handles requests with non-json `keys` query parameter', () => {
      testReq.query.keys = 'aaaa';

      return Promise
        .all([
          controller.request(testReq, testRes),
          Promise.resolve()
        ])
        .then(() => {
          service.filterOfflineRequest.callCount.should.equal(0);
          testRes.json.callCount.should.equal(1);
          testRes.status.callCount.should.equal(1);
          testRes.status.args[0][0].should.equal(400);
          testRes.json.args[0][0].error.should.equal('bad_request');
        });
    });

    it('handles requests with non-array `keys` query parameter', () => {
      testReq.query.keys = JSON.stringify({ some: 'thing' });

      return Promise
        .all([
          controller.request(testReq, testRes),
          Promise.resolve()
        ])
        .then(() => {
          service.filterOfflineRequest.callCount.should.equal(0);
          testRes.json.callCount.should.equal(1);
          testRes.status.callCount.should.equal(1);
          testRes.status.args[0][0].should.equal(400);
          testRes.json.args[0][0].error.should.equal('bad_request');
        });
    });
  });
});
