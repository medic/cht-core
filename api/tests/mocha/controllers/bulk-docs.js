const sinon = require('sinon');
const auth = require('../../../src/auth');
require('chai').should();
const controller = require('../../../src/controllers/bulk-docs');
const service = require('../../../src/services/bulk-docs');
const serverUtils = require('../../../src/server-utils');

let testReq;
let testRes;
let next;

describe('Bulk Docs controller', () => {
  beforeEach(() => {
    sinon.stub(auth, 'getUserCtx');
    sinon.stub(auth, 'hasAllPermissions');
    sinon.stub(auth, 'isOnlineOnly');
    sinon.stub(service, 'bulkDelete');
    sinon.stub(service, 'filterOfflineRequest').resolves();
    sinon.stub(service, 'formatResults');
    sinon.stub(serverUtils, 'serverError');

    testReq = {
      body: {
        docs: []
      }
    };

    testRes = {
      json: sinon.stub(),
      status: sinon.stub()
    };

    next = sinon.stub();
  });

  afterEach(() => {
    sinon.restore();
  });

  it('checks that user is an admin', () => {
    const userCtx = {};
    auth.getUserCtx.resolves(userCtx);
    auth.hasAllPermissions.returns(true);
    auth.isOnlineOnly.withArgs(userCtx).returns(false);
    const next = sinon.stub();
    return controller.bulkDelete(testReq, testRes, next)
      .then(() => {
        auth.getUserCtx.callCount.should.equal(1);
        auth.hasAllPermissions.callCount.should.equal(1);
        auth.hasAllPermissions.args[0][1].should.to.deep.equal(['can_edit']);
        auth.isOnlineOnly.callCount.should.equal(1);
        next.callCount.should.equal(1);
        next.getCall(0).args[0].code.should.equal(401);
      });
  });

  describe('request', () => {

    describe('invalidRequest', () => {
      it('returns error when body is not set', () => {
        controller._invalidRequest(false).should.deep.equal({ error: 'bad_request', reason: 'invalid UTF-8 JSON' });
      });

      it('returns error when body is missing `docs` property', () => {
        controller._invalidRequest({ body: {} }).should.deep.equal(
          { error: 'bad_request', reason: 'POST body must include `docs` parameter.' });
      });

      it('returns error when `docs` is not an array', () => {
        controller._invalidRequest({ body: { docs: 'alpha' } }).should.deep.equal(
          { error: 'bad_request', reason: '`docs` parameter must be an array.' });
      });
    });

    describe('intercept response', () => {
      it('calls service format results and returns json results', () => {
        service.formatResults.returns(['formatted', 'results']);
        testReq.body = {
          docs: ['filteredDocs'],
          new_edits: 'something'
        };
        controller._interceptResponse(['requestDocs'], testReq, testRes, JSON.stringify(['results']));
        service.formatResults.callCount.should.equal(1);
        service.formatResults.args[0].should.deep.equal([
          ['requestDocs'],
          ['filteredDocs'],
          ['results']
        ]);

        testRes.json.callCount.should.equal(1);
        testRes.json.args[0].should.deep.equal([['formatted', 'results']]);
      });
    });

    it('handles requests without a body', () => {
      testReq.body = null;

      return Promise
        .all([
          controller.request(testReq, testRes, next),
          Promise.resolve()
        ]).then(() => {
          testRes.status.callCount.should.equal(1);
          testRes.status.args[0][0].should.equal(400);
          service.filterOfflineRequest.callCount.should.equal(0);
          testRes.json.callCount.should.equal(1);
          testRes.json.args[0][0].error.should.equal('bad_request');
        });
    });

    it('handles requests without `docs` parameter', () => {
      testReq.body = { some: 'thing' };

      return Promise
        .all([
          controller.request(testReq, testRes, next),
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
          controller.request(testReq, testRes, next),
          Promise.resolve()
        ]).then(() => {
          service.filterOfflineRequest.callCount.should.equal(0);
          testRes.json.callCount.should.equal(1);
          testRes.status.callCount.should.equal(1);
          testRes.status.args[0][0].should.equal(400);
          testRes.json.args[0][0].error.should.equal('bad_request');
        });
    });

    it('catches service errors', () => {
      service.filterOfflineRequest.rejects({ error: 'something' });

      return controller.request(testReq, testRes, next).then(() => {
        serverUtils.serverError.callCount.should.equal(1);
        serverUtils.serverError.args[0][0].should.deep.equal({ error: 'something' });
      });
    });

    it('filters for offline requests', () => {
      testReq.body = { docs: ['some', 'longer', 'doc', 'list'] };
      service.filterOfflineRequest.resolves(['some', 'doc', 'list']);
      return controller
        .request(testReq, testRes, next)
        .then(() => {
          service.filterOfflineRequest.callCount.should.equal(1);
          service.filterOfflineRequest.args[0]
            .should.deep.equal([ testReq.userCtx, ['some', 'longer', 'doc', 'list'] ]);
          testRes.interceptResponse.should.be.a('function');
          testReq.body.docs.should.deep.equal(['some', 'doc', 'list']);
          next.callCount.should.equal(1);
        });
    });

  });
});
