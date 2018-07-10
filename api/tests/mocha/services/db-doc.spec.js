const sinon = require('sinon').sandbox.create();
require('chai').should();

const service = require('../../../src/services/db-doc'),
      db = require('../../../src/db-pouch'),
      authorization = require('../../../src/services/authorization');

let userCtx,
    params,
    method,
    query,
    body;

describe('db-doc service', () => {
  beforeEach(function() {
    userCtx = { name: 'user' };
    params = { docId: 'id' };
    query = {};
    method = 'GET';

    sinon.stub(authorization, 'allowedDoc');
    sinon.stub(authorization, 'alwaysAllowCreate');
    sinon.stub(authorization, 'getAuthorizationContext').resolves({ subjectIds: [1, 3, 4], userCtx: { name: 'user' } });
    sinon.stub(authorization, 'getViewResults').callsFake(doc => ({ view: doc }));
    sinon.stub(db.medic, 'get').resolves({});
  });

  afterEach(function() {
    sinon.restore();
  });

  describe('getStoredDoc', () => {
    it('returns false when request has no docID param', () => {
      params = {};
      return service
        ._getStoredDoc(params, method, query)
        .then(result => {
          db.medic.get.callCount.should.equal(0);
          result.should.equal(false);
        });
    });

    it('queries the database with request docId and req.query params when request method is GET', () => {
      query = { rev: '1-rev', revs: true, open_revs: true, revs_info: true };

      db.medic.get.resolves({ _id: 'id', _rev: '1-rev' });
      return service
        ._getStoredDoc(params, method, query)
        .then(result => {
          db.medic.get.callCount.should.equal(1);
          db.medic.get.args[0].should.deep.equal(['id', query]);
          result.should.deep.equal({ _id: 'id', _rev: '1-rev' });
        });
    });

    it('queries the database with docId and no options when request method is not GET', () => {
      query =  { rev: '1-rev', revs: true, open_revs: true, revs_info: true };
      method = 'POST';
      db.medic.get.resolves({ _id: 'id', _rev: '1-rev' });
      return service
        ._getStoredDoc(params, method, query)
        .then(result => {
          db.medic.get.callCount.should.equal(1);
          db.medic.get.args[0].should.deep.equal(['id', {}]);
          result.should.deep.equal({ _id: 'id', _rev: '1-rev' });
        });
    });

    it('queries the database with docId and no rev when request method is GET', () => {
      db.medic.get.resolves({ _id: 'id', _rev: '1-rev' });
      return service
        ._getStoredDoc(params, method, query)
        .then(result => {
          db.medic.get.callCount.should.equal(1);
          db.medic.get.args[0].should.deep.equal(['id', {}]);
          result.should.deep.equal({ _id: 'id', _rev: '1-rev' });
        });
    });

    it('catches db 404s', () => {
      db.medic.get.rejects({ status: 404 });
      return service
        ._getStoredDoc(params, method, query)
        .then(result => {
          db.medic.get.args[0].should.deep.equal(['id', {}]);
          result.should.deep.equal(false);
        });
    });

    it('throws other errors', () => {
      db.medic.get.rejects({ some: 'error' });
      return service
        ._getStoredDoc(params, method, query)
        .then(result => result.should.equal('Should throw an error'))
        .catch(err => err.should.deep.equal({ some: 'error' }));
    });
  });

  describe('getRequestDoc', () => {
    it('returns request body, if existent and request is not attachment request', () => {
      service._getRequestDoc('GET').should.equal(false);
      service._getRequestDoc('POST', 'test').should.equal('test');
      service._getRequestDoc('POST', 'test', true).should.equal(false);
    });
  });

  describe('Filter Offline Request', () => {
    it('throws db errors', () => {
      db.medic.get.rejects(new Error('something'));
      return service
        .filterOfflineRequest(userCtx, params, method, query, body)
        .catch(err => {
          authorization.allowedDoc.callCount.should.equal(0);
          err.message.should.equal('something');
        });
    });

    it('calls authorization.getAuthorizationContext with correct params', () => {
      return service
        .filterOfflineRequest(userCtx, params, method, query, body)
        .then(() => {
          authorization.getAuthorizationContext.callCount.should.equal(1);
          authorization.getAuthorizationContext.args[0].should.deep.equal([{ name: 'user' }]);
        });
    });

    it('calls authorization.allowedDoc with correct params for GET / DELETE  requests', () => {
      const doc = { _id: 'id', _rev: '1' };
      db.medic.get.resolves(doc);

      return service
        .filterOfflineRequest(userCtx, params, method, query, body)
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
      method = 'PUT';
      body = requestDoc;
      db.medic.get.resolves(dbDoc);

      authorization.allowedDoc.returns(true);

      return service
        .filterOfflineRequest(userCtx, params, method, query, body)
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
      params = {};
      method = 'POST';
      body = doc;
      authorization.allowedDoc.returns(true);

      return service
        .filterOfflineRequest(userCtx, params, method, query, body)
        .then(() => {
          authorization.getViewResults.callCount.should.equal(1);
          authorization.getViewResults.args[0].should.deep.equal([doc]);

          authorization.allowedDoc.callCount.should.equal(1);
          authorization.allowedDoc.args[0].should.deep.equal(
            ['id', { subjectIds: [1, 3, 4], userCtx: { name: 'user' }}, { view: doc } ]);
        });
    });

    it('passes to next route when access is granted', () => {
      authorization.allowedDoc.returns(true);

      userCtx = { name: 'user' };
      method = 'PUT';

      return service
        .filterOfflineRequest(userCtx, params, method, query, body)
        .then(result => {
          authorization.allowedDoc.callCount.should.equal(2);
          result.should.equal(true);
        });
    });

    it('responds with an error when access is not granted', () => {
      authorization.allowedDoc.returns(false);

      userCtx = { name: 'user' };
      method = 'PUT';

      return service
        .filterOfflineRequest(userCtx, params, method, query, body)
        .then(result => {
          authorization.allowedDoc.callCount.should.equal(1);
          result.should.equal(false);
        });
    });

  });

  describe('Scenarios', () => {
    beforeEach(() => {
      query = { rev: '1' };
    });

    describe('GET', () => {
      it('returns false for non-existent doc', () => {
        db.medic.get.rejects({ status: 404 });
        return service
          .filterOfflineRequest(userCtx, params, method, query, body)
          .then(result => {
            result.should.equal(false);
            db.medic.get.callCount.should.equal(1);
            db.medic.get.args[0].should.deep.equal(['id', { rev: '1' }]);
          });
      });

      it('returns false for not allowed existent doc', () => {
        db.medic.get.resolves({ _id: 'id' });
        authorization.allowedDoc.returns(false);
        authorization.alwaysAllowCreate.returns(false);

        return service
          .filterOfflineRequest(userCtx, params, method, query, body)
          .then(result => {
            result.should.equal(false);
            authorization.allowedDoc.callCount.should.equal(1);
            authorization.allowedDoc.args[0].should.deep.equal([
              'id', { userCtx: { name: 'user' }, subjectIds: [1, 3, 4]}, { view: { _id: 'id' }}
            ]);
            authorization.alwaysAllowCreate.callCount.should.equal(0);
          });
      });

      it('returns false for not allowed and always allowed to create existent doc', () => {
        db.medic.get.resolves({ _id: 'id' });
        authorization.allowedDoc.returns(false);
        authorization.alwaysAllowCreate.returns(true);

        return service
          .filterOfflineRequest(userCtx, params, method, query, body)
          .then(result => {
            result.should.equal(false);
            authorization.allowedDoc.callCount.should.equal(1);
            authorization.allowedDoc.args[0].should.deep.equal([
              'id', { userCtx: { name: 'user' }, subjectIds: [1, 3, 4]}, { view: { _id: 'id' }}
            ]);
          });
      });

      it('returns db-doc for allowed existent doc', () => {
        db.medic.get.resolves({ _id: 'id' });
        authorization.allowedDoc.returns(true);

        return service
          .filterOfflineRequest(userCtx, params, method, query, body)
          .then(result => {
            authorization.allowedDoc.callCount.should.equal(1);
            result.should.deep.equal({ _id: 'id' });
          });
      });
    });

    describe('DELETE', () => {
      beforeEach(() => method = 'DELETE');

      it('returns false for non existent DOC', () => {
        db.medic.get.rejects({ status: 404 });
        return service
          .filterOfflineRequest(userCtx, params, method, query, body)
          .then(result => {
            result.should.equal(false);
            db.medic.get.callCount.should.equal(1);
            db.medic.get.args[0].should.deep.equal(['id', {}]);
          });
      });

      it('returns false for not allowed existent doc', () => {
        db.medic.get.resolves({ _id: 'id' });
        authorization.allowedDoc.returns(false);

        return service
          .filterOfflineRequest(userCtx, params, method, query, body)
          .then(result => {
            result.should.equal(false);
            authorization.allowedDoc.callCount.should.equal(1);
            authorization.allowedDoc.args[0].should.deep.equal([
              'id', { userCtx: { name: 'user' }, subjectIds: [1, 3, 4]}, { view: { _id: 'id' }}
            ]);
          });
      });

      it('returns false for not allowed, always allowed to create existent doc', () => {
        db.medic.get.resolves({ _id: 'id' });
        authorization.allowedDoc.returns(false);
        authorization.alwaysAllowCreate.returns(true);

        return service
          .filterOfflineRequest(userCtx, params, method, query, body)
          .then(result => {
            result.should.equal(false);
            authorization.allowedDoc.callCount.should.equal(1);
            authorization.allowedDoc.args[0].should.deep.equal([
              'id', { userCtx: { name: 'user' }, subjectIds: [1, 3, 4]}, { view: { _id: 'id' }}
            ]);
            authorization.alwaysAllowCreate.callCount.should.equal(0);
          });
      });

      it('returns true for allowed existent doc', () => {
        db.medic.get.resolves({ _id: 'id' });
        authorization.allowedDoc.returns(true);

        return service
          .filterOfflineRequest(userCtx, params, method, query, body)
          .then(result => {
            result.should.equal(true);
            authorization.allowedDoc.callCount.should.equal(1);
          });
      });
    });

    describe('POST', () => {
      beforeEach(() => {
        method = 'POST';
        body = { _id: 'id', some: 'data' };
        params = {};
      });

      it('returns false for not allowed request doc', () => {
        authorization.allowedDoc.returns(false);

        return service
          .filterOfflineRequest(userCtx, params, method, query, body)
          .then(result => {
            authorization.allowedDoc.callCount.should.equal(1);
            authorization.allowedDoc.args[0].should.deep.equal([
              'id', { userCtx: { name: 'user' }, subjectIds: [1, 3, 4] }, { view: { _id: 'id', some: 'data' }}
            ]);
            db.medic.get.callCount.should.equal(0);
            result.should.equal(false);
          });
      });

      it('returns true for not allowed, but always allowed to create request doc', () => {
        authorization.allowedDoc.returns(false);
        authorization.alwaysAllowCreate.returns(true);

        return service
          .filterOfflineRequest(userCtx, params, method, query, body)
          .then(result => {
            authorization.alwaysAllowCreate.callCount.should.equal(1);
            authorization.allowedDoc.callCount.should.equal(0);
            db.medic.get.callCount.should.equal(0);
            result.should.equal(true);
          });
      });

      it('returns true for allowed request doc', () => {
        authorization.allowedDoc.returns(true);

        return service
          .filterOfflineRequest(userCtx, params, method, query, body)
          .then(result => {
            authorization.allowedDoc.callCount.should.equal(1);
            db.medic.get.callCount.should.equal(0);
            result.should.equal(true);
          });
      });
    });

    describe('PUT', () => {
      beforeEach(() => {
        method = 'PUT';
        body = { _id: 'id', some: 'data' };
      });

      it('returns false for non existent db doc, not allowed request doc', () => {
        db.medic.get.rejects({ status: 404 });
        authorization.allowedDoc.returns(false);

        return service
          .filterOfflineRequest(userCtx, params, method, query, body)
          .then(result => {
            authorization.allowedDoc.callCount.should.equal(1);
            authorization.allowedDoc.args[0].should.deep.equal([
              'id', { userCtx: { name: 'user' }, subjectIds: [1, 3, 4] }, { view: { _id: 'id', some: 'data' }}
            ]);
            db.medic.get.callCount.should.equal(1);
            result.should.equal(false);
          });
      });

      it('returns true for non existent db doc, allowed request doc', () => {
        db.medic.get.rejects({ status: 404 });
        authorization.allowedDoc.returns(true);

        return service
          .filterOfflineRequest(userCtx, params, method, query, body)
          .then(result => {
            authorization.allowedDoc.callCount.should.equal(1);
            authorization.allowedDoc.args[0].should.deep.equal([
              'id', { userCtx: { name: 'user' }, subjectIds: [1, 3, 4] }, { view: { _id: 'id', some: 'data' }}
            ]);
            db.medic.get.callCount.should.equal(1);
            result.should.equal(true);
          });
      });

      it('returns false for existent db doc, not allowed existent, not allowed new', () => {
        db.medic.get.resolves({ _id: 'id' });

        authorization.allowedDoc.returns(false);
        return service
          .filterOfflineRequest(userCtx, params, method, query, body)
          .then(result => {
            authorization.allowedDoc.callCount.should.equal(1);
            authorization.allowedDoc.args[0].should.deep.equal([
              'id', { userCtx: { name: 'user' }, subjectIds: [1, 3, 4] }, { view: { _id: 'id' }}
            ]);
            db.medic.get.callCount.should.equal(1);
            result.should.equal(false);
          });
      });

      it('returns false for existent db doc, not allowed existent, allowed new', () => {
        db.medic.get.resolves({ _id: 'id' });

        authorization.allowedDoc
          .withArgs('id', { userCtx: { name: 'user' }, subjectIds: [1, 3, 4] }, { view: { _id: 'id' }}).returns(false);
        authorization.allowedDoc
          .withArgs('id', { userCtx: { name: 'user' }, subjectIds: [1, 3, 4] }, { view: { _id: 'id', some: 'data' }})
          .returns(true);

        return service
          .filterOfflineRequest(userCtx, params, method, query, body)
          .then(result => {
            authorization.allowedDoc.callCount.should.equal(1);
            authorization.allowedDoc.args[0].should.deep.equal([
              'id', { userCtx: { name: 'user' }, subjectIds: [1, 3, 4] }, { view: { _id: 'id' }}
            ]);
            db.medic.get.callCount.should.equal(1);
            result.should.equal(false);
          });
      });

      it('returns false for existent db doc, allowed existent, not allowed new', () => {
        db.medic.get.resolves({ _id: 'id' });

        authorization.allowedDoc
          .withArgs('id', { userCtx: { name: 'user' }, subjectIds: [1, 3, 4] }, { view: { _id: 'id' }}).returns(true);
        authorization.allowedDoc
          .withArgs('id', { userCtx: { name: 'user' }, subjectIds: [1, 3, 4] }, { view: { _id: 'id', some: 'data' }})
          .returns(false);

        return service
          .filterOfflineRequest(userCtx, params, method, query, body)
          .then(result => {
            authorization.allowedDoc.callCount.should.equal(2);
            authorization.allowedDoc.args[0].should.deep.equal([
              'id', { userCtx: { name: 'user' }, subjectIds: [1, 3, 4] }, { view: { _id: 'id' }}
            ]);
            authorization.allowedDoc.args[1].should.deep.equal([
              'id', { userCtx: { name: 'user' }, subjectIds: [1, 3, 4] }, { view: { _id: 'id', some: 'data' }}
            ]);
            db.medic.get.callCount.should.equal(1);
            result.should.equal(false);
          });
      });

      it('returns true for existent db doc, allowed existent, allowed new', () => {
        db.medic.get.resolves({ _id: 'id' });

        authorization.allowedDoc.returns(true);

        return service
          .filterOfflineRequest(userCtx, params, method, query, body)
          .then(result => {
            authorization.allowedDoc.callCount.should.equal(2);
            authorization.allowedDoc.args[0].should.deep.equal([
              'id', { userCtx: { name: 'user' }, subjectIds: [1, 3, 4] }, { view: { _id: 'id' }}
            ]);
            authorization.allowedDoc.args[1].should.deep.equal([
              'id', { userCtx: { name: 'user' }, subjectIds: [1, 3, 4] }, { view: { _id: 'id', some: 'data' }}
            ]);
            db.medic.get.callCount.should.equal(1);
            result.should.equal(true);
          });
      });

      it('returns true for non-existent always allowed to create doc', () => {
        db.medic.get.rejects({ status: 404 });
        authorization.allowedDoc.returns(false);
        authorization.alwaysAllowCreate.returns(true);

        return service
          .filterOfflineRequest(userCtx, params, method, query, body)
          .then(result => {
            authorization.allowedDoc.callCount.should.equal(0);
            authorization.alwaysAllowCreate.callCount.should.equal(1);
            db.medic.get.callCount.should.equal(1);
            result.should.equal(true);
          });
      });

      it('returns false for existent always allowed to create doc', () => {
        db.medic.get.resolves({ _id: 'id' });

        authorization.allowedDoc.returns(false);
        authorization.alwaysAllowCreate.returns(true);

        return service
          .filterOfflineRequest(userCtx, params, method, query, body)
          .then(result => {
            authorization.allowedDoc.callCount.should.equal(1);
            authorization.allowedDoc.args[0].should.deep.equal([
              'id', { userCtx: { name: 'user' }, subjectIds: [1, 3, 4] }, { view: { _id: 'id' }}
            ]);
            authorization.alwaysAllowCreate.callCount.should.equal(0);
            db.medic.get.callCount.should.equal(1);
            result.should.equal(false);
          });
      });
    });

    describe('attachments', () => {
      beforeEach(() => {
        query = { rev: '1' };
        params.attachmentId = 'attachmentID';
      });

      it('returns false for non existent doc', () => {
        db.medic.get.rejects({ status: 404 });

        return service
          .filterOfflineRequest(userCtx, params, method, query, body)
          .then(result => {
            authorization.allowedDoc.callCount.should.equal(0);
            db.medic.get.callCount.should.equal(1);
            db.medic.get.args[0].should.deep.equal([ 'id', { rev: '1' } ]);
            result.should.equal(false);
          });
      });

      it('returns false for existent not allowed doc', () => {
        db.medic.get.resolves({ _id: 'id' });

        return service
          .filterOfflineRequest(userCtx, params, method, query, body)
          .then(result => {
            authorization.allowedDoc.callCount.should.equal(1);
            authorization.allowedDoc.args[0].should.deep.equal([
              'id', { userCtx: { name: 'user' }, subjectIds: [1, 3, 4] }, { view: { _id: 'id' }}
            ]);
            db.medic.get.callCount.should.equal(1);
            db.medic.get.args[0].should.deep.equal(['id', { rev: '1' }]);

            result.should.equal(false);
          });
      });

      it('returns true for existent allowed doc', () => {
        db.medic.get.resolves({ _id: 'id' });
        authorization.allowedDoc.returns(true);

        return service
          .filterOfflineRequest(userCtx, params, method, query, body)
          .then(result => {
            authorization.allowedDoc.callCount.should.equal(1);
            authorization.allowedDoc.args[0].should.deep.equal([
              'id', { userCtx: { name: 'user' }, subjectIds: [1, 3, 4] }, { view: { _id: 'id' }}
            ]);
            db.medic.get.callCount.should.equal(1);
            db.medic.get.args[0].should.deep.equal(['id', { rev: '1'}]);

            result.should.equal(true);
          });
      });
    });
  });

});
