const service = require('../../../src/services/db-doc');
const db = require('../../../src/db-pouch');
const sinon = require('sinon').sandbox.create();
require('chai').should();

const authorization = require('../../../src/services/authorization');
const serverUtils = require('../../../src/server-utils');

let testReq, testRes, next;

describe('db-doc service', () => {
  beforeEach(function() {
    testRes = {
      type: sinon.stub(),
      send: sinon.stub(),
      status: sinon.stub()
    };

    testReq = { params: { docId: 'id'}};
    next = sinon.stub();

    sinon.stub(authorization, 'allowedDoc');
    sinon.stub(authorization, 'getUserAuthorizationData').resolves({ subjectIds: [1, 3, 4] });
    sinon.stub(authorization, 'getViewResults').callsFake(doc => ({ view: doc }));
    sinon.stub(serverUtils, 'serverError');
    sinon.stub(db.medic, 'get').resolves({});
  });

  afterEach(function() {
    sinon.restore();
  });

  describe('Is Valid Request', () => {
    it('invalid for invalid methods', () => {
      service.isValidRequest('HEAD', 'a').should.equal(false);
    });

    it('POST should not have docId parameter and should have a body', () => {
      service.isValidRequest('POST', 'a').should.equal(false);
      service.isValidRequest('POST', null, null).should.equal(false);
    });

    it('docId is required for all methods, except POST', () => {
      service.isValidRequest('GET').should.equal(false);
      service.isValidRequest('PUT').should.equal(false);
      service.isValidRequest('DELETE').should.equal(false);
    });

    it('validates correct request', () => {
      service.isValidRequest('POST', null, { a: 'b' }).should.equal(true);
      service.isValidRequest('GET', 'a').should.equal(true);
      service.isValidRequest('PUT', 'a').should.equal(true);
      service.isValidRequest('DELETE', 'a').should.equal(true);
    });
  });

  describe('getStoredDoc', () => {
    it('returns false when request has no docID param', () => {
      testReq = {};
      return service._getStoredDoc(testReq).then(result => {
        db.medic.get.callCount.should.equal(0);
        result.should.equal(false);
      });
    });

    it('queries the database with request docId and rev when request method is GET', () => {
      testReq = { params: { docId: 'id' }, query: { rev: '1-rev' }, method: 'GET' };
      db.medic.get.resolves({ _id: 'id', _rev: '1-rev' });
      return service._getStoredDoc(testReq).then(result => {
        db.medic.get.callCount.should.equal(1);
        db.medic.get.args[0].should.deep.equal(['id', { rev: '1-rev' }]);
        result.should.deep.equal({ _id: 'id', _rev: '1-rev' });
      });
    });

    it('queries the database with docId and no rev when request method is not GET', () => {
      testReq = { params: { docId: 'id' }, query: { rev: '1-rev' }, method: 'POST' };
      db.medic.get.resolves({ _id: 'id', _rev: '1-rev' });
      return service._getStoredDoc(testReq).then(result => {
        db.medic.get.callCount.should.equal(1);
        db.medic.get.args[0].should.deep.equal(['id', {}]);
        result.should.deep.equal({ _id: 'id', _rev: '1-rev' });
      });
    });

    it('queries the database with docId and no rev when request method is GET', () => {
      testReq = { params: { docId: 'id' } };
      db.medic.get.resolves({ _id: 'id', _rev: '1-rev' });
      return service._getStoredDoc(testReq).then(result => {
        db.medic.get.callCount.should.equal(1);
        db.medic.get.args[0].should.deep.equal(['id', {}]);
        result.should.deep.equal({ _id: 'id', _rev: '1-rev' });
      });
    });

    it('catches db 404s', () => {
      testReq = { params: { docId: 'id' } };
      db.medic.get.rejects({ status: 404 });
      return service._getStoredDoc(testReq).then(result => {
        db.medic.get.args[0].should.deep.equal(['id', {}]);
        result.should.deep.equal(false);
      });
    });

    it('throws other errors', () => {
      db.medic.get.rejects({ some: 'error' });
      return service
        ._getStoredDoc(testReq)
        .then(result => result.should.equal('Should throw an error'))
        .catch(err => err.should.deep.equal({ some: 'error' }));
    });
  });

  describe('getRequestDoc', () => {
    it('returns request body, if existent and request is not attachment request', () => {
      service._getRequestDoc({}).should.equal(false);
      service._getRequestDoc({ body: 'test' }).should.equal('test');
      service._getRequestDoc({ body: 'test' }, true).should.equal(false);
    });
  });

  describe('Filter Restricted Request', () => {
    it('catches db errors', () => {
      db.medic.get.rejects({ some: 'error' });
      return service
        .filterOfflineRequest(testReq, testRes, next)
        .then(() => {
          authorization.allowedDoc.callCount.should.equal(0);
          serverUtils.serverError.callCount.should.equal(1);
          serverUtils.serverError.args[0].should.deep.equal([{ some: 'error' }, testReq, testRes]);
        });
    });

    it('calls authorization.getUserAuthorizationData with correct params', () => {
      testReq.userCtx = { name: 'user' };

      return service
        .filterOfflineRequest(testReq, testRes, next)
        .then(() => {
          authorization.getUserAuthorizationData.callCount.should.equal(1);
          authorization.getUserAuthorizationData.args[0].should.deep.equal([{ name: 'user' }]);
        });
    });

    it('calls authorization.allowedDoc with correct params for GET / DELETE  requests', () => {
      const doc = { _id: 'id', _rev: '1' };
      testReq.userCtx = { name: 'user' };
      testReq.method = 'GET';
      db.medic.get.resolves(doc);

      return service
        .filterOfflineRequest(testReq, testRes, next)
        .then(() => {
          authorization.getViewResults.callCount.should.equal(1);
          authorization.getViewResults.args[0].should.deep.equal([doc]);

          authorization.allowedDoc.callCount.should.equal(1);
          authorization.allowedDoc.args[0].should.deep.equal(
            ['id', { subjectIds: [1, 3, 4], userCtx: { name: 'user' }}, { view: doc } ]);
        });
    });

    it('calls authorization.allowedDoc with correct params for PUT requests', () => {
      const dbDoc = { _id: 'id', _rev: '1' },
            requestDoc = { _id: 'id', _rev: '1', some: 'data' };
      testReq.userCtx = { name: 'user' };
      testReq.method = 'PUT';
      testReq.body = requestDoc;
      db.medic.get.resolves(dbDoc);

      authorization.allowedDoc.returns(true);

      return service
        .filterOfflineRequest(testReq, testRes, next)
        .then(() => {
          authorization.getViewResults.callCount.should.equal(2);
          authorization.getViewResults.args[0].should.deep.equal([dbDoc]);
          authorization.getViewResults.args[1].should.deep.equal([requestDoc]);

          authorization.allowedDoc.callCount.should.equal(2);
          authorization.allowedDoc.args[0].should.deep.equal(
            ['id', { subjectIds: [1, 3, 4], userCtx: { name: 'user' }}, { view: dbDoc } ]);
          authorization.allowedDoc.args[1].should.deep.equal(
            ['id', { subjectIds: [1, 3, 4], userCtx: { name: 'user' }}, { view: requestDoc } ]);
        });
    });

    it('calls authorization.allowedDoc with correct params for POST requests', () => {
      const doc = { _id: 'id', _rev: '1' };
      testReq = { params: {}, userCtx: { name: 'user' }, method: 'POST', body: doc };
      authorization.allowedDoc.returns(true);

      return service
        .filterOfflineRequest(testReq, testRes, next)
        .then(() => {
          authorization.getViewResults.callCount.should.equal(1);
          authorization.getViewResults.args[0].should.deep.equal([doc]);

          authorization.allowedDoc.callCount.should.equal(1);
          authorization.allowedDoc.args[0].should.deep.equal(
            ['id', { subjectIds: [1, 3, 4], userCtx: { name: 'user' }}, { view: doc } ]);
        });
    });

    it('passes to next route when access is granted', () => {
      testReq.method = 'GET';
      authorization.allowedDoc.returns(true);

      testReq.userCtx = { name: 'user' };
      testReq.method = 'PUT';

      return service
        .filterOfflineRequest(testReq, testRes, next)
        .then(() => {
          authorization.allowedDoc.callCount.should.equal(1);
          next.callCount.should.equal(1);
          testRes.send.callCount.should.equal(0);
        });
    });

    it('responds with an error when access is not granted', () => {
      testReq.method = 'GET';
      authorization.allowedDoc.returns(false);

      testReq.userCtx = { name: 'user' };
      testReq.method = 'PUT';

      return service
        .filterOfflineRequest(testReq, testRes, next)
        .then(() => {
          authorization.allowedDoc.callCount.should.equal(1);
          next.callCount.should.equal(0);
          testRes.send.callCount.should.equal(1);
          testRes.send.args[0][0].should.equal(
            JSON.stringify({error: 'forbidden', reason: 'Insufficient privileges'})
          );
          testRes.status.callCount.should.equal(1);
          testRes.status.args[0][0].should.equal(403);
        });
    });

  });

  describe('Scenarios', () => {
    beforeEach(() => {
      testReq.query = { rev: '1' };
      testReq.userCtx = { user: 'name' };
    });

    describe('GET', () => {
      beforeEach(() => testReq.method = 'GET');

      it('blocks for non-existent doc', () => {
        db.medic.get.rejects({ status: 404 });
        return service
          .filterOfflineRequest(testReq, testRes, next)
          .then(() => {
            next.callCount.should.equal(0);
            testRes.send.callCount.should.equal(1);
            db.medic.get.callCount.should.equal(1);
            db.medic.get.args[0].should.deep.equal(['id', { rev: '1' }]);
          });
      });

      it('blocks for not allowed existent doc', () => {
        db.medic.get.resolves({ _id: 'id' });
        authorization.allowedDoc.returns(false);

        return service
          .filterOfflineRequest(testReq, testRes, next)
          .then(() => {
            next.callCount.should.equal(0);
            testRes.send.callCount.should.equal(1);
            authorization.allowedDoc.callCount.should.equal(1);
            authorization.allowedDoc.args[0].should.deep.equal([
              'id', { userCtx: { user: 'name' }, subjectIds: [1, 3, 4]}, { view: { _id: 'id' }}
            ]);
          });
      });

      it('proxies for allowed existent doc', () => {
        db.medic.get.resolves({ _id: 'id' });
        authorization.allowedDoc.returns(true);

        return service
          .filterOfflineRequest(testReq, testRes, next)
          .then(() => {
            next.callCount.should.equal(1);
            testRes.send.callCount.should.equal(0);
            authorization.allowedDoc.callCount.should.equal(1);
          });
      });
    });

    describe('DELETE', () => {
      beforeEach(() => testReq.method = 'DELETE');

      it('blocks for non existent DOC', () => {
        db.medic.get.rejects({ status: 404 });
        return service
          .filterOfflineRequest(testReq, testRes, next)
          .then(() => {
            next.callCount.should.equal(0);
            testRes.send.callCount.should.equal(1);
            db.medic.get.callCount.should.equal(1);
            db.medic.get.args[0].should.deep.equal(['id', {}]);
          });
      });

      it('blocks for not allowed existent doc', () => {
        db.medic.get.resolves({ _id: 'id' });
        authorization.allowedDoc.returns(false);

        return service
          .filterOfflineRequest(testReq, testRes, next)
          .then(() => {
            next.callCount.should.equal(0);
            testRes.send.callCount.should.equal(1);
            authorization.allowedDoc.callCount.should.equal(1);
            authorization.allowedDoc.args[0].should.deep.equal([
              'id', { userCtx: { user: 'name' }, subjectIds: [1, 3, 4]}, { view: { _id: 'id' }}
            ]);
          });
      });

      it('proxies for allowed existent doc', () => {
        db.medic.get.resolves({ _id: 'id' });
        authorization.allowedDoc.returns(true);

        return service
          .filterOfflineRequest(testReq, testRes, next)
          .then(() => {
            next.callCount.should.equal(1);
            testRes.send.callCount.should.equal(0);
            authorization.allowedDoc.callCount.should.equal(1);
          });
      });
    });

    describe('POST', () => {
      beforeEach(() => {
        testReq.method = 'POST';
        testReq.params = {};
        testReq.body = { _id: 'id', some: 'data' };
        testReq.userCtx = { user: 'name' };
      });

      it('blocks for not allowed request doc', () => {
        authorization.allowedDoc.returns(false);

        return service
          .filterOfflineRequest(testReq, testRes, next)
          .then(() => {
            authorization.allowedDoc.callCount.should.equal(1);
            authorization.allowedDoc.args[0].should.deep.equal([
              'id', { userCtx: { user: 'name' }, subjectIds: [1, 3, 4] }, { view: { _id: 'id', some: 'data' }}
            ]);
            db.medic.get.callCount.should.equal(0);
            next.callCount.should.equal(0);
            testRes.send.callCount.should.equal(1);
          });
      });

      it('proxies for allowed request doc', () => {
        authorization.allowedDoc.returns(true);

        return service
          .filterOfflineRequest(testReq, testRes, next)
          .then(() => {
            authorization.allowedDoc.callCount.should.equal(1);
            db.medic.get.callCount.should.equal(0);
            next.callCount.should.equal(1);
            testRes.send.callCount.should.equal(0);
          });
      });
    });

    describe('PUT', () => {
      beforeEach(() => {
        testReq.method = 'POST';
        testReq.params = { docId: 'id' };
        testReq.body = { _id: 'id', some: 'data' };
        testReq.userCtx = { user: 'name' };
      });

      it('blocks for non existent db doc, not allowed request doc', () => {
        db.medic.get.rejects({ status: 404 });
        authorization.allowedDoc.returns(false);

        return service
          .filterOfflineRequest(testReq, testRes, next)
          .then(() => {
            authorization.allowedDoc.callCount.should.equal(1);
            authorization.allowedDoc.args[0].should.deep.equal([
              'id', { userCtx: { user: 'name' }, subjectIds: [1, 3, 4] }, { view: { _id: 'id', some: 'data' }}
            ]);
            db.medic.get.callCount.should.equal(1);
            next.callCount.should.equal(0);
            testRes.send.callCount.should.equal(1);
          });
      });

      it('proxies for non existent db doc, allowed request doc', () => {
        db.medic.get.rejects({ status: 404 });
        authorization.allowedDoc.returns(true);

        return service
          .filterOfflineRequest(testReq, testRes, next)
          .then(() => {
            authorization.allowedDoc.callCount.should.equal(1);
            authorization.allowedDoc.args[0].should.deep.equal([
              'id', { userCtx: { user: 'name' }, subjectIds: [1, 3, 4] }, { view: { _id: 'id', some: 'data' }}
            ]);
            db.medic.get.callCount.should.equal(1);
            next.callCount.should.equal(1);
            testRes.send.callCount.should.equal(0);
          });
      });

      it('blocks for existent db doc, not allowed existent, not allowed new', () => {
        db.medic.get.resolves({ _id: 'id' });

        authorization.allowedDoc.returns(false);
        return service
          .filterOfflineRequest(testReq, testRes, next)
          .then(() => {
            authorization.allowedDoc.callCount.should.equal(1);
            authorization.allowedDoc.args[0].should.deep.equal([
              'id', { userCtx: { user: 'name' }, subjectIds: [1, 3, 4] }, { view: { _id: 'id' }}
            ]);
            db.medic.get.callCount.should.equal(1);
            next.callCount.should.equal(0);
            testRes.send.callCount.should.equal(1);
          });
      });

      it('blocks for existent db doc, not allowed existent, allowed new', () => {
        db.medic.get.resolves({ _id: 'id' });

        authorization.allowedDoc
          .withArgs('id', { userCtx: { user: 'name' }, subjectIds: [1, 3, 4] }, { view: { _id: 'id' }}).returns(false);
        authorization.allowedDoc
          .withArgs('id', { userCtx: { user: 'name' }, subjectIds: [1, 3, 4] }, { view: { _id: 'id', some: 'data' }})
          .returns(true);

        return service
          .filterOfflineRequest(testReq, testRes, next)
          .then(() => {
            authorization.allowedDoc.callCount.should.equal(1);
            authorization.allowedDoc.args[0].should.deep.equal([
              'id', { userCtx: { user: 'name' }, subjectIds: [1, 3, 4] }, { view: { _id: 'id' }}
            ]);
            db.medic.get.callCount.should.equal(1);
            next.callCount.should.equal(0);
            testRes.send.callCount.should.equal(1);
          });
      });

      it('blocks for existent db doc, allowed existent, not allowed new', () => {
        db.medic.get.resolves({ _id: 'id' });

        authorization.allowedDoc
          .withArgs('id', { userCtx: { user: 'name' }, subjectIds: [1, 3, 4] }, { view: { _id: 'id' }}).returns(true);
        authorization.allowedDoc
          .withArgs('id', { userCtx: { user: 'name' }, subjectIds: [1, 3, 4] }, { view: { _id: 'id', some: 'data' }})
          .returns(false);

        return service
          .filterOfflineRequest(testReq, testRes, next)
          .then(() => {
            authorization.allowedDoc.callCount.should.equal(2);
            authorization.allowedDoc.args[0].should.deep.equal([
              'id', { userCtx: { user: 'name' }, subjectIds: [1, 3, 4] }, { view: { _id: 'id' }}
            ]);
            authorization.allowedDoc.args[1].should.deep.equal([
              'id', { userCtx: { user: 'name' }, subjectIds: [1, 3, 4] }, { view: { _id: 'id', some: 'data' }}
            ]);
            db.medic.get.callCount.should.equal(1);
            next.callCount.should.equal(0);
            testRes.send.callCount.should.equal(1);
          });
      });

      it('proxies for existent db doc, allowed existent, allowed new', () => {
        db.medic.get.resolves({ _id: 'id' });

        authorization.allowedDoc.returns(true);

        return service
          .filterOfflineRequest(testReq, testRes, next)
          .then(() => {
            authorization.allowedDoc.callCount.should.equal(2);
            authorization.allowedDoc.args[0].should.deep.equal([
              'id', { userCtx: { user: 'name' }, subjectIds: [1, 3, 4] }, { view: { _id: 'id' }}
            ]);
            authorization.allowedDoc.args[1].should.deep.equal([
              'id', { userCtx: { user: 'name' }, subjectIds: [1, 3, 4] }, { view: { _id: 'id', some: 'data' }}
            ]);
            db.medic.get.callCount.should.equal(1);
            next.callCount.should.equal(1);
            testRes.send.callCount.should.equal(0);
          });
      });
    });

    describe('attachments', () => {
      beforeEach(() => testReq.query = { rev: '1' });

      it('blocks for non existent doc', () => {
        db.medic.get.rejects({ status: 404 });

        return service
          .filterOfflineRequest(testReq, testRes, next)
          .then(() => {
            authorization.allowedDoc.callCount.should.equal(0);
            db.medic.get.callCount.should.equal(1);
            next.callCount.should.equal(0);
            testRes.send.callCount.should.equal(1);
          });
      });

      it('blocks for existent not allowed doc', () => {
        testReq.METHOD = 'GET';
        db.medic.get.resolves({ _id: 'id' });

        return service
          .filterOfflineRequest(testReq, testRes, next)
          .then(() => {
            authorization.allowedDoc.callCount.should.equal(1);
            authorization.allowedDoc.args[0].should.deep.equal([
              'id', { userCtx: { user: 'name' }, subjectIds: [1, 3, 4] }, { view: { _id: 'id' }}
            ]);
            db.medic.get.callCount.should.equal(1);
            db.medic.get.args[0].should.deep.equal(['id', {}]);

            next.callCount.should.equal(0);
            testRes.send.callCount.should.equal(1);
          });
      });

      it('proxies for existent allowed doc', () => {
        testReq.METHOD = 'GET';
        db.medic.get.resolves({ _id: 'id' });
        authorization.allowedDoc.returns(true);

        return service
          .filterOfflineRequest(testReq, testRes, next)
          .then(() => {
            authorization.allowedDoc.callCount.should.equal(1);
            authorization.allowedDoc.args[0].should.deep.equal([
              'id', { userCtx: { user: 'name' }, subjectIds: [1, 3, 4] }, { view: { _id: 'id' }}
            ]);
            db.medic.get.callCount.should.equal(1);
            db.medic.get.args[0].should.deep.equal(['id', {}]);

            next.callCount.should.equal(1);
            testRes.send.callCount.should.equal(0);
          });
      });
    });
  });

});
