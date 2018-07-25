const sinon = require('sinon').sandbox.create();
require('chai').should();
const controller = require('../../../src/controllers/db-doc'),
      service = require('../../../src/services/db-doc'),
      serverUtils = require('../../../src/server-utils');

let testReq,
    testRes,
    next;

describe('db-doc controller', () => {
  beforeEach(() => {
    sinon.stub(service, 'filterOfflineRequest').resolves();
    sinon.stub(serverUtils, 'serverError');

    testReq = { body: {}, method: 'GET', params: { docId: 'a' }, query: {}};
    testRes = {
      json: sinon.stub(),
      status: sinon.stub()
    };
    next = sinon.stub().resolves();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('request', () => {
    describe('Is Valid Request', () => {
      it('invalid for invalid methods', () => {
        controller._isValidRequest('HEAD', 'a').should.equal(false);
      });

      it('POST should not have docId parameter and should have a body', () => {
        controller._isValidRequest('POST', 'a').should.equal(false);
        controller._isValidRequest('POST', null, null).should.equal(false);
      });

      it('docId is required for all methods, except POST', () => {
        controller._isValidRequest('GET').should.equal(false);
        controller._isValidRequest('PUT').should.equal(false);
        controller._isValidRequest('DELETE').should.equal(false);
      });

      it('validates correct request', () => {
        controller._isValidRequest('POST', null, { a: 'b' }).should.equal(true);
        controller._isValidRequest('GET', 'a').should.equal(true);
        controller._isValidRequest('PUT', 'a').should.equal(true);
        controller._isValidRequest('DELETE', 'a').should.equal(true);
      });
    });

    describe('isValidAttachmentRequest', () => {
      it('returns true for non-attachment requests', () => {
        controller._isValidAttachmentRequest({}, {}).should.equal(true);
        controller._isValidAttachmentRequest({ something: true }, {}).should.equal(true);
        controller._isValidAttachmentRequest({ attachmentId: false }, {}).should.equal(true);
      });

      it('returns true for attachment requests with rev parameter', () => {
        controller._isValidAttachmentRequest({ attachmentId: 'attId' }, { rev: 'something' }).should.equal(true);
      });

      it('returns false for attachment requests without rev parameter', () => {
        controller._isValidAttachmentRequest({ attachmentId: 'attId' }, {}).should.equal(false);
        controller._isValidAttachmentRequest({ attachmentId: 'attId' }, { something: true }).should.equal(false);
        controller._isValidAttachmentRequest({ attachmentId: 'attId' }, { rev: false }).should.equal(false);
      });
    });

    it('forwards to next route when docID is a couchDB endpoint or a _design document', () => {
      testReq.params.docId = '_bulk_docs';
      controller.request(testReq, testRes, next);
      next.callCount.should.equal(1);
      next.args[0].should.deep.equal(['route']);

      testReq.params.docId = '_all_docs';
      controller.request(testReq, testRes, next);
      next.callCount.should.equal(2);
      next.args[1].should.deep.equal(['route']);

      testReq.params.docId = '_bulk_get';
      controller.request(testReq, testRes, next);
      next.callCount.should.equal(3);
      next.args[2].should.deep.equal(['route']);

      testReq.params.docId = '_changes';
      controller.request(testReq, testRes, next);
      next.callCount.should.equal(4);
      next.args[3].should.deep.equal(['route']);

      testReq.params.docId = '_design';
      controller.request(testReq, testRes, next);
      next.callCount.should.equal(5);
      next.args[4].should.deep.equal(['route']);
    });

    it('filters document requests when the request is valid', () => {
      service.filterOfflineRequest.resolves(true);
      return controller
        .request(testReq, testRes, next)
        .then(() => {
          service.filterOfflineRequest.callCount.should.equal(1);
          service.filterOfflineRequest.args[0].should.deep.equal(
            [ testReq.userCtx, testReq.params, testReq.method, testReq.query, testReq.body ]);
          next.callCount.should.equal(1);
          testRes.json.callCount.should.equal(0);
        });
    });

    it('sends received filtered result when it is an object', () => {
      service.filterOfflineRequest.resolves({ some: 'thing' });
      return controller
        .request(testReq, testRes, next)
        .then(() => {
          next.callCount.should.equal(0);
          service.filterOfflineRequest.callCount.should.equal(1);
          service.filterOfflineRequest.args[0].should.deep.equal([
            testReq.userCtx, testReq.params, testReq.method, testReq.query, testReq.body ]);
          next.callCount.should.equal(0);
          testRes.json.callCount.should.equal(1);
          testRes.json.args[0].should.deep.equal([{ some: 'thing' }]);
        });
    });

    it('sends error when document request is not valid', () => {
      testReq.method = 'POST';

      controller.request(testReq, testRes, next);

      next.callCount.should.equal(0);
      testRes.status.callCount.should.equal(1);
      testRes.status.args[0].should.deep.equal([403]);
      testRes.json.callCount.should.deep.equal(1);
      testRes.json.args[0].should.deep.equal([{ error: 'forbidden', reason: 'Insufficient privileges' }]);
      service.filterOfflineRequest.callCount.should.equal(0);
    });

    it('sends error when document request is not allowed', () => {
      service.filterOfflineRequest.resolves(false);
      return controller
        .request(testReq, testRes, next)
        .then(() => {
          next.callCount.should.equal(0);
          testRes.status.callCount.should.equal(1);
          testRes.status.args[0].should.deep.equal([403]);
          testRes.json.callCount.should.deep.equal(1);
          testRes.json.args[0].should.deep.equal([{ error: 'forbidden', reason: 'Insufficient privileges' }]);
        });
    });

    it('sends 404 error when request is an invalid attachment request without rev', () => {
      testReq.query = {};
      testReq.params.attachmentId = 'something';
      service.filterOfflineRequest.resolves(false);
      return controller
        .request(testReq, testRes, next)
        .then(() => {
          next.callCount.should.equal(0);
          testRes.status.callCount.should.equal(1);
          testRes.status.args[0].should.deep.equal([404]);
          testRes.json.callCount.should.deep.equal(1);
          testRes.json.args[0].should.deep.equal([{ error: 'bad_request', reason: 'Invalid rev format' }]);
          service.filterOfflineRequest.callCount.should.equal(1);
        });
    });

    it('sends 403 error when request is an invalid attachment request with rev', () => {
      testReq.query = { rev: 'something' };
      testReq.params.attachmentId = 'something';
      service.filterOfflineRequest.resolves(false);
      return controller
        .request(testReq, testRes, next)
        .then(() => {
          next.callCount.should.equal(0);
          testRes.status.callCount.should.equal(1);
          testRes.status.args[0].should.deep.equal([403]);
          testRes.json.callCount.should.deep.equal(1);
          testRes.json.args[0].should.deep.equal([{ error: 'forbidden', reason: 'Insufficient privileges' }]);
          service.filterOfflineRequest.callCount.should.equal(1);
        });
    });

    it('catches service errors', () => {
      service.filterOfflineRequest.rejects({ error: 'something' });

      return controller
        .request(testReq, testRes, next)
        .catch(() => {
          serverUtils.serverError.callCount.should.equal(1);
          serverUtils.serverError.args[0][0].should.deep.equal({ error: 'something' });
        });
    });
  });

  describe('requestDdoc', () => {
    beforeEach(() => testReq.params = { ddocId: 'someddoc' });

    it('forwards appddoc requests to the next route', () => {
      return controller
        .requestDdoc('someddoc', testReq, testRes, next)
        .then(() => {
          next.callCount.should.equal(1);
          next.args[0].should.deep.equal(['route']);
          service.filterOfflineRequest.callCount.should.equal(0);
        });
    });

    it('constructs correct docId when ddoc is not appddoc and continues request when allowed', () => {
      service.filterOfflineRequest.resolves(true);
      return controller
        .requestDdoc('otherddoc', testReq, testRes, next)
        .then(() => {
          testReq.params.docId.should.equal('_design/someddoc');
          service.filterOfflineRequest.callCount.should.equal(1);
          service.filterOfflineRequest.args[0][1].should.deep.equal({ docId: '_design/someddoc', ddocId: 'someddoc' });
          next.callCount.should.equal(1);
        });
    });

    it('responds with ddoc body when received', () => {
      service.filterOfflineRequest.resolves({ _id: '_design/someddoc' });

      return controller
        .requestDdoc('otherddoc', testReq, testRes, next)
        .then(() => {
          testReq.params.docId.should.equal('_design/someddoc');
          service.filterOfflineRequest.callCount.should.equal(1);
          service.filterOfflineRequest.args[0][1].should.deep.equal({ docId: '_design/someddoc', ddocId: 'someddoc' });
          next.callCount.should.equal(0);
          testRes.json.callCount.should.deep.equal(1);
          testRes.json.args[0].should.deep.equal([{ _id: '_design/someddoc' }]);
        });
    });

    it('blocks requests for not allowed ddocs', () => {
      service.filterOfflineRequest.resolves(false);

      return controller
        .requestDdoc('otherddoc', testReq, testRes, next)
        .then(() => {
          testReq.params.docId.should.equal('_design/someddoc');
          service.filterOfflineRequest.callCount.should.equal(1);
          service.filterOfflineRequest.args[0][1].should.deep.equal({ docId: '_design/someddoc', ddocId: 'someddoc' });

          next.callCount.should.equal(0);
          testRes.status.callCount.should.equal(1);
          testRes.status.args[0].should.deep.equal([403]);
          testRes.json.callCount.should.deep.equal(1);
          testRes.json.args[0].should.deep.equal([{ error: 'forbidden', reason: 'Insufficient privileges' }]);
        });
    });
  });
});
