const sinon = require('sinon').sandbox.create();
const auth = require('../../../src/auth');
require('chai').should();
const controller = require('../../../src/controllers/bulk-docs');
const service = require('../../../src/services/bulk-docs'),
      serverUtils = require('../../../src/server-utils');

let testReq,
    testRes,
    next;

describe('Bulk Docs controller', () => {
  beforeEach(() => {
    sinon.stub(auth, 'getUserCtx');
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
      type: sinon.stub(),
      send: sinon.stub()
    };

    next = sinon.stub();
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
          'something',
          ['requestDocs'],
          ['filteredDocs'],
          ['results']
        ]);

        testRes.send.callCount.should.equal(1);
        testRes.send.args[0].should.deep.equal([JSON.stringify(['formatted', 'results'])]);
      });
    });

    it('handles requests without a body', () => {
      testReq.body = null;

      return Promise
        .all([
          controller.request(testReq, testRes, next),
          Promise.resolve()
        ]).then(() => {
          testRes.type.callCount.should.equal(1);
          testRes.type.args[0][0].should.equal('json');
          service.filterOfflineRequest.callCount.should.equal(0);
          testRes.send.callCount.should.equal(1);
          JSON.parse(testRes.send.args[0][0]).error.should.equal('bad_request');
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
          testRes.send.callCount.should.equal(1);
          JSON.parse(testRes.send.args[0][0]).error.should.equal('bad_request');
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
          testRes.send.callCount.should.equal(1);
          JSON.parse(testRes.send.args[0][0]).error.should.equal('bad_request');
        });
    });

    it('catches service errors', () => {
      service.filterOfflineRequest.rejects({ error: 'something' });

      return controller.request(testReq, testRes, next).then(() => {
        serverUtils.serverError.callCount.should.equal(1);
        serverUtils.serverError.args[0][0].should.deep.equal({ error: 'something' });
      });
    });

    it ('filters for offline requests', () => {
      service.filterOfflineRequest.resolves(['some', 'doc', 'list']);
      return controller
        .request(testReq, testRes, next)
        .then(() => {
          service.filterOfflineRequest.callCount.should.equal(1);
          service.filterOfflineRequest.args[0].should.deep.equal([ testReq ]);
          testRes.interceptResponse.should.be.a('function');
          testReq.body.docs.should.deep.equal(['some', 'doc', 'list']);
          next.callCount.should.equal(1);
        });
    });

  });
});
