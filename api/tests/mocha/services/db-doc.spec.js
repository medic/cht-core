const sinon = require('sinon');
require('chai').should();
const rewire = require('rewire');
const authorization = require('../../../src/services/authorization');
const db = require('../../../src/db');
const service = rewire('../../../src/services/db-doc');

let userCtx;
let params;
let method;
let query;
let body;
let doc;

describe('db-doc service', () => {
  beforeEach(function() {
    userCtx = { name: 'user' };
    params = { docId: 'id' };
    query = {};
    method = 'GET';

    sinon.stub(authorization, 'allowedDoc');
    sinon.stub(authorization, 'alwaysAllowCreate');
    sinon.stub(authorization, 'getScopedAuthorizationContext').resolves({ userCtx, subjectIds: [] });
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
        .__get__('getStoredDoc')(params, method, query)
        .then(result => {
          db.medic.get.callCount.should.equal(0);
          result.should.equal(false);
        });
    });

    it('queries the database with request docId and req.query params when request method is GET', () => {
      query = { rev: '1-rev', revs: true, open_revs: true, revs_info: true };

      db.medic.get.resolves({ _id: 'id', _rev: '1-rev' });
      return service
        .__get__('getStoredDoc')(params, method, query)
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
        .__get__('getStoredDoc')(params, method, query)
        .then(result => {
          db.medic.get.callCount.should.equal(1);
          db.medic.get.args[0].should.deep.equal(['id', {}]);
          result.should.deep.equal({ _id: 'id', _rev: '1-rev' });
        });
    });

    it('queries the database with docId and no rev when request method is GET', () => {
      db.medic.get.resolves({ _id: 'id', _rev: '1-rev' });
      return service
        .__get__('getStoredDoc')(params, method, query)
        .then(result => {
          db.medic.get.callCount.should.equal(1);
          db.medic.get.args[0].should.deep.equal(['id', {}]);
          result.should.deep.equal({ _id: 'id', _rev: '1-rev' });
        });
    });

    it('catches db 404s', () => {
      db.medic.get.rejects({ status: 404 });
      return service
        .__get__('getStoredDoc')(params, method, query)
        .then(result => {
          db.medic.get.args[0].should.deep.equal(['id', {}]);
          result.should.deep.equal(false);
        });
    });

    it('throws other errors', () => {
      db.medic.get.rejects({ some: 'error' });
      return service
        .__get__('getStoredDoc')(params, method, query)
        .then(result => result.should.equal('Should throw an error'))
        .catch(err => err.should.deep.equal({ some: 'error' }));
    });

    it('array open_revs query param', () => {
      query.open_revs = ['a', 'b', 'c'];
      db.medic.get.resolves({ some: 'thing'});
      return service
        .__get__('getStoredDoc')(params, method, query)
        .then(result => {
          result.should.deep.equal({ some: 'thing' });
          db.medic.get.callCount.should.equal(1);
          db.medic.get.args[0].should.deep.equal(['id', { open_revs: ['a', 'b', 'c'] }]);
        });
    });

    it('supports open_revs===all query param', () => {
      query.open_revs = 'all';
      db.medic.get.resolves({ some: 'thing'});
      return service
        .__get__('getStoredDoc')(params, method, query)
        .then(result => {
          result.should.deep.equal({ some: 'thing' });
          db.medic.get.callCount.should.equal(1);
          db.medic.get.args[0].should.deep.equal(['id', { open_revs: 'all' }]);
        });
    });

    it('supports open_revs===false query param', () => {
      query.open_revs = false;
      db.medic.get.resolves({ some: 'thing'});
      return service
        .__get__('getStoredDoc')(params, method, query)
        .then(result => {
          result.should.deep.equal({ some: 'thing' });
          db.medic.get.callCount.should.equal(1);
          db.medic.get.args[0].should.deep.equal(['id', { open_revs: false }]);
        });
    });

    it('throws when incorrect open_revs param', () => {
      query.open_revs = 'something';
      db.medic.get.rejects({ some: 'thing'});
      return service
        .__get__('getStoredDoc')(params, method, query)
        .then(result => result.should.equal('Should throw an error'))
        .catch(err => err.should.deep.equal({ some: 'thing'}));
    });

    it('omits latest query param', () => {
      query = { rev: '1-rev', revs: true, open_revs: true, revs_info: true, latest: true };

      db.medic.get.resolves({ _id: 'id', _rev: '1-rev' });
      return service
        .__get__('getStoredDoc')(params, method, query)
        .then(result => {
          db.medic.get.callCount.should.equal(1);
          db.medic.get.args[0]
            .should.deep.equal(['id', { rev: '1-rev', revs: true, open_revs: true, revs_info: true }]);
          result.should.deep.equal({ _id: 'id', _rev: '1-rev' });
        });
    });
  });

  describe('getRequestDoc', () => {
    it('returns request body, if existent and request is not attachment request', () => {
      service.__get__('getRequestDoc')('GET').should.equal(false);
      service.__get__('getRequestDoc')('POST', 'test').should.equal('test');
      service.__get__('getRequestDoc')('POST', 'test', true).should.equal(false);
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

    it('calls authorization.getScopedAuthorizationContext with correct params', () => {
      method = 'PUT';
      const stored = { _id: 'id', _rev: '1-rev' };
      body = { _id: 'id', _rev: '2-rev' };
      db.medic.get.resolves(stored);

      return service
        .filterOfflineRequest(userCtx, params, method, query, body)
        .then(() => {
          authorization.getScopedAuthorizationContext.callCount.should.equal(1);
          authorization.getScopedAuthorizationContext.args[0].should.deep.equal([
            { name: 'user' },
            [
              { doc: stored, viewResults: { view: stored } }, // stored doc
              { doc: body, viewResults: { view: body } } // request doc
            ]
          ]);
        });
    });

    it('calls authorization.allowedDoc with correct params for GET / DELETE  requests', () => {
      const doc = { _id: 'id', _rev: '1-rev' };
      db.medic.get.resolves(doc);
      authorization.getScopedAuthorizationContext.resolves({ userCtx, subjectIds: [ 'id'] });

      return service
        .filterOfflineRequest(userCtx, params, method, query, body)
        .then(() => {
          authorization.getViewResults.callCount.should.equal(1);
          authorization.getViewResults.args[0].should.deep.equal([doc]);

          authorization.allowedDoc.callCount.should.equal(1);
          authorization.allowedDoc.args[0].should.deep.equal(['id', { subjectIds: ['id'], userCtx }, { view: doc } ]);
        });
    });

    it('calls authorization.allowedDoc with correct params for PUT requests', () => {
      const dbDoc = { _id: 'id', _rev: '1-rev' };
      const requestDoc = { _id: 'id', _rev: '1-rev', some: 'data' };
      method = 'PUT';
      body = requestDoc;
      db.medic.get.resolves(dbDoc);
      authorization.getScopedAuthorizationContext.resolves({ userCtx, subjectIds: [ 'id'] });

      authorization.allowedDoc.returns(true);

      return service
        .filterOfflineRequest(userCtx, params, method, query, body)
        .then(() => {
          authorization.getViewResults.callCount.should.equal(2);
          authorization.getViewResults.args[0].should.deep.equal([dbDoc]);
          authorization.getViewResults.args[1].should.deep.equal([requestDoc]);

          authorization.allowedDoc.callCount.should.equal(2);
          authorization.allowedDoc.args[0]
            .should.deep.equal(['id', { subjectIds: ['id'], userCtx }, { view: dbDoc } ]);
          authorization.allowedDoc.args[1]
            .should.deep.equal(['id', { subjectIds: ['id'], userCtx }, { view: requestDoc } ]);
        });
    });

    it('calls authorization.allowedDoc with correct params for POST requests', () => {
      const doc = { _id: 'id', _rev: '1-rev' };
      params = {};
      method = 'POST';
      body = doc;
      authorization.allowedDoc.returns(true);
      authorization.getScopedAuthorizationContext.resolves({ userCtx, subjectIds: [ 'id'] });

      return service
        .filterOfflineRequest(userCtx, params, method, query, body)
        .then(() => {
          authorization.getViewResults.callCount.should.equal(1);
          authorization.getViewResults.args[0].should.deep.equal([doc]);

          authorization.allowedDoc.callCount.should.equal(1);
          authorization.allowedDoc.args[0].should.deep.equal(['id', { subjectIds: ['id'], userCtx }, { view: doc } ]);
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
      query = { rev: '1-rev' };
      doc = { _id: 'id' };
    });

    describe('GET', () => {
      it('returns false for non-existent doc', () => {
        db.medic.get.rejects({ status: 404 });
        return service
          .filterOfflineRequest(userCtx, params, method, query, body)
          .then(result => {
            result.should.equal(false);
            db.medic.get.callCount.should.equal(1);
            db.medic.get.args[0].should.deep.equal(['id', { rev: '1-rev' }]);
            authorization.getScopedAuthorizationContext.callCount.should.equal(0);
          });
      });

      it('returns false for not allowed existent doc', () => {
        db.medic.get.resolves(doc);
        authorization.allowedDoc.returns(false);
        authorization.alwaysAllowCreate.returns(false);

        return service
          .filterOfflineRequest(userCtx, params, method, query, body)
          .then(result => {
            result.should.equal(false);
            authorization.allowedDoc.callCount.should.equal(1);
            authorization.allowedDoc.args[0].should.deep.equal([ 'id', { userCtx, subjectIds: []}, { view: doc} ]);
            authorization.alwaysAllowCreate.callCount.should.equal(0);
            authorization.getScopedAuthorizationContext.args[0].should.deep.equal([
              userCtx,
              [ { doc, viewResults: { view: doc }}, undefined ]
            ]);
          });
      });

      it('returns false for not allowed and always allowed to create existent doc', () => {
        db.medic.get.resolves(doc);
        authorization.allowedDoc.returns(false);
        authorization.alwaysAllowCreate.returns(true);

        return service
          .filterOfflineRequest(userCtx, params, method, query, body)
          .then(result => {
            result.should.equal(false);
            authorization.getScopedAuthorizationContext.args[0].should.deep.equal([
              userCtx,
              [{ doc, viewResults: { view: doc }}, undefined ]
            ]);
            authorization.allowedDoc.callCount.should.equal(1);
            authorization.allowedDoc.args[0].should.deep.equal([ 'id', { userCtx, subjectIds: [] }, { view: doc } ]);
          });
      });

      it('returns db-doc for allowed existent doc', () => {
        db.medic.get.resolves(doc);
        authorization.allowedDoc.returns(true);
        authorization.getScopedAuthorizationContext.resolves({ userCtx, subjectIds: [ 'id'] });

        return service
          .filterOfflineRequest(userCtx, params, method, query, body)
          .then(result => {
            authorization.allowedDoc.callCount.should.equal(1);
            authorization.allowedDoc.args[0].should.deep.equal(['id', { userCtx, subjectIds: ['id'] }, { view: doc }]);
            result.should.deep.equal(doc);
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
            authorization.getScopedAuthorizationContext.callCount.should.equal(0);
          });
      });

      it('returns false for not allowed existent doc', () => {
        db.medic.get.resolves(doc);
        authorization.allowedDoc.returns(false);

        return service
          .filterOfflineRequest(userCtx, params, method, query, body)
          .then(result => {
            result.should.equal(false);
            authorization.allowedDoc.callCount.should.equal(1);
            authorization.allowedDoc.args[0].should.deep.equal([ 'id', { userCtx, subjectIds: []}, { view: doc } ]);
            authorization.getScopedAuthorizationContext.args[0].should.deep.equal([
              userCtx,
              [{ doc, viewResults: { view: doc } }, undefined ]
            ]);
          });
      });

      it('returns false for not allowed, always allowed to create existent doc', () => {
        db.medic.get.resolves(doc);
        authorization.allowedDoc.returns(false);
        authorization.alwaysAllowCreate.returns(true);

        return service
          .filterOfflineRequest(userCtx, params, method, query, body)
          .then(result => {
            result.should.equal(false);
            authorization.allowedDoc.callCount.should.equal(1);
            authorization.allowedDoc.args[0].should.deep.equal([ 'id', { userCtx, subjectIds: []}, { view: doc } ]);
            authorization.alwaysAllowCreate.callCount.should.equal(0);
          });
      });

      it('returns true for allowed existent doc', () => {
        db.medic.get.resolves(doc);
        authorization.allowedDoc.returns(true);
        authorization.getScopedAuthorizationContext.resolves({ userCtx, subjectIds: [ 'id'] });

        return service
          .filterOfflineRequest(userCtx, params, method, query, body)
          .then(result => {
            result.should.equal(true);
            authorization.allowedDoc.callCount.should.equal(1);
            authorization.getScopedAuthorizationContext.args[0].should.deep.equal([
              userCtx,
              [{ doc: doc, viewResults: { view: doc } }, undefined ]
            ]);
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
            authorization.allowedDoc.args[0]
              .should.deep.equal([ 'id', { userCtx, subjectIds: [] }, { view: { _id: 'id', some: 'data' }} ]);
            db.medic.get.callCount.should.equal(0);
            authorization.getScopedAuthorizationContext.args[0].should.deep.equal([
              userCtx,
              [ undefined, { doc: body, viewResults: { view: body } }]
            ]);
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
            authorization.getScopedAuthorizationContext.args[0].should.deep.equal([
              userCtx,
              [ undefined, { doc: body, viewResults: { view: body } }]
            ]);
            result.should.equal(true);
          });
      });

      it('returns true for allowed request doc', () => {
        authorization.allowedDoc.returns(true);
        authorization.getScopedAuthorizationContext.resolves({ userCtx, subjectIds: [ body._id ] });

        return service
          .filterOfflineRequest(userCtx, params, method, query, body)
          .then(result => {
            authorization.allowedDoc.callCount.should.equal(1);
            authorization.allowedDoc.args[0]
              .should.deep.equal([ body._id, { userCtx, subjectIds: [ body._id ] }, { view: body } ]);
            db.medic.get.callCount.should.equal(0);
            result.should.equal(true);
          });
      });
    });

    describe('PUT', () => {
      beforeEach(() => {
        method = 'PUT';
        body = { _id: 'id', some: 'data' };
        doc = { _id: 'id' };
      });

      it('returns false for non existent db doc, not allowed request doc', () => {
        db.medic.get.rejects({ status: 404 });
        authorization.allowedDoc.returns(false);

        return service
          .filterOfflineRequest(userCtx, params, method, query, body)
          .then(result => {
            authorization.allowedDoc.callCount.should.equal(1);
            authorization.allowedDoc.args[0].should.deep.equal([ 'id', { userCtx, subjectIds: [] }, { view: body } ]);
            db.medic.get.callCount.should.equal(1);
            result.should.equal(false);
          });
      });

      it('returns true for non existent db doc, allowed request doc', () => {
        db.medic.get.rejects({ status: 404 });
        authorization.allowedDoc.returns(true);
        authorization.getScopedAuthorizationContext.resolves({ userCtx, subjectIds: [ body._id] });

        return service
          .filterOfflineRequest(userCtx, params, method, query, body)
          .then(result => {
            authorization.allowedDoc.callCount.should.equal(1);
            authorization.allowedDoc.args[0]
              .should.deep.equal([ 'id', { userCtx, subjectIds: [body._id] }, { view: body } ]);
            db.medic.get.callCount.should.equal(1);
            result.should.equal(true);
          });
      });

      it('returns false for existent db doc, not allowed existent, not allowed new', () => {
        db.medic.get.resolves(doc);

        authorization.allowedDoc.returns(false);
        return service
          .filterOfflineRequest(userCtx, params, method, query, body)
          .then(result => {
            authorization.allowedDoc.callCount.should.equal(1);
            authorization.allowedDoc.args[0].should.deep.equal([ 'id', { userCtx, subjectIds: [] }, { view: doc } ]);
            db.medic.get.callCount.should.equal(1);
            result.should.equal(false);
          });
      });

      it('returns false for existent db doc, not allowed existent, allowed new', () => {
        db.medic.get.resolves(doc);

        authorization.allowedDoc.withArgs('id', { userCtx, subjectIds: [] }, { view: doc }).returns(false);
        authorization.allowedDoc.withArgs('id', { userCtx, subjectIds: [] }, { view: body }).returns(true);
        authorization.getScopedAuthorizationContext.resolves({ userCtx, subjectIds: [] });

        return service
          .filterOfflineRequest(userCtx, params, method, query, body)
          .then(result => {
            authorization.allowedDoc.callCount.should.equal(1);
            authorization.allowedDoc.args[0].should.deep.equal([ 'id', { userCtx, subjectIds: [] }, { view: doc } ]);
            db.medic.get.callCount.should.equal(1);
            result.should.equal(false);
          });
      });

      it('returns false for existent db doc, allowed existent, not allowed new', () => {
        db.medic.get.resolves(doc);

        authorization.allowedDoc.withArgs('id', { userCtx, subjectIds: [] }, { view: doc}).returns(true);
        authorization.allowedDoc.withArgs('id', { userCtx, subjectIds: [] }, { view: body }).returns(false);
        authorization.getScopedAuthorizationContext.resolves({ userCtx, subjectIds: [] });

        return service
          .filterOfflineRequest(userCtx, params, method, query, body)
          .then(result => {
            authorization.allowedDoc.callCount.should.equal(2);
            authorization.allowedDoc.args[0].should.deep.equal([ 'id', { userCtx, subjectIds: [] }, { view: doc } ]);
            authorization.allowedDoc.args[1].should.deep.equal([ 'id', { userCtx, subjectIds: [] }, { view: body } ]);
            db.medic.get.callCount.should.equal(1);
            result.should.equal(false);
            authorization.getScopedAuthorizationContext.args[0].should.deep.equal([
              userCtx,
              [ { doc, viewResults: { view: doc } }, { doc: body, viewResults: { view: body } } ],
            ]);
          });
      });

      it('returns true for existent db doc, allowed existent, allowed new', () => {
        db.medic.get.resolves(doc);

        authorization.allowedDoc.returns(true);
        authorization.getScopedAuthorizationContext.resolves({ userCtx, subjectIds: [ 'id'] });

        return service
          .filterOfflineRequest(userCtx, params, method, query, body)
          .then(result => {
            authorization.allowedDoc.callCount.should.equal(2);
            authorization.allowedDoc.args[0]
              .should.deep.equal([ 'id', { userCtx, subjectIds: ['id'] }, { view: doc } ]);
            authorization.allowedDoc.args[1]
              .should.deep.equal([ 'id', { userCtx, subjectIds: ['id'] }, { view: body } ]);
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
        db.medic.get.resolves(doc);

        authorization.allowedDoc.returns(false);
        authorization.alwaysAllowCreate.returns(true);

        return service
          .filterOfflineRequest(userCtx, params, method, query, body)
          .then(result => {
            authorization.allowedDoc.callCount.should.equal(1);
            authorization.allowedDoc.args[0].should.deep.equal([ 'id', { userCtx, subjectIds: [] }, { view: doc } ]);
            authorization.alwaysAllowCreate.callCount.should.equal(0);
            db.medic.get.callCount.should.equal(1);
            result.should.equal(false);
          });
      });
    });

    describe('attachments', () => {
      let doc;
      beforeEach(() => {
        query = { rev: '1-rev' };
        params.attachmentId = 'attachmentID';
        doc = { _id: 'id' };
      });

      it('returns false for non existent doc', () => {
        db.medic.get.rejects({ status: 404 });

        return service
          .filterOfflineRequest(userCtx, params, method, query, body)
          .then(result => {
            authorization.allowedDoc.callCount.should.equal(0);
            db.medic.get.callCount.should.equal(1);
            db.medic.get.args[0].should.deep.equal([ 'id', { rev: '1-rev' } ]);
            result.should.equal(false);
          });
      });

      it('returns false for existent not allowed doc', () => {
        db.medic.get.resolves(doc);

        return service
          .filterOfflineRequest(userCtx, params, method, query, body)
          .then(result => {
            authorization.allowedDoc.callCount.should.equal(1);
            authorization.allowedDoc.args[0].should.deep.equal([ 'id', { userCtx, subjectIds: [] }, { view: doc } ]);
            db.medic.get.callCount.should.equal(1);
            db.medic.get.args[0].should.deep.equal(['id', { rev: '1-rev' }]);

            result.should.equal(false);
          });
      });

      it('returns true for existent allowed doc', () => {
        db.medic.get.resolves(doc);
        authorization.allowedDoc.returns(true);
        authorization.getScopedAuthorizationContext.resolves({ userCtx, subjectIds: [ 'id'] });

        return service
          .filterOfflineRequest(userCtx, params, method, query, body)
          .then(result => {
            authorization.getScopedAuthorizationContext.callCount.should.equal(1);
            authorization.getScopedAuthorizationContext.args[0].should.deep.equal([
              userCtx,
              [{ doc, viewResults: { view: doc } }, undefined ]
            ]);
            authorization.allowedDoc.callCount.should.equal(1);
            authorization.allowedDoc.args[0].should.deep.equal([ 'id', { userCtx, subjectIds: ['id'] }, { view: doc }]);
            db.medic.get.callCount.should.equal(1);
            db.medic.get.args[0].should.deep.equal(['id', { rev: '1-rev'}]);

            result.should.equal(true);
          });
      });
    });
  });

  describe('filterOfflineOpenRevsRequest', () => {
    it('throws db errors', () => {
      db.medic.get.rejects(new Error('something'));
      return service
        .filterOfflineOpenRevsRequest(userCtx, params, query)
        .catch(err => {
          authorization.allowedDoc.callCount.should.equal(0);
          err.message.should.equal('something');
        });
    });

    it('calls authorization.getScopedAuthorizationContext with correct params', () => {
      db.medic.get.resolves([]);
      return service
        .filterOfflineOpenRevsRequest(userCtx, params, query)
        .then(() => {
          authorization.getScopedAuthorizationContext.callCount.should.equal(1);
          authorization.getScopedAuthorizationContext.args[0].should.deep.equal([ userCtx, []]);
        });
    });

    it('calls db get with correct params', () => {
      db.medic.get.resolves([]);
      query.open_revs = ['a', 'b', 'c'];
      return service
        .filterOfflineOpenRevsRequest(userCtx, params, query)
        .then(result => {
          result.should.deep.equal([]);
          db.medic.get.callCount.should.deep.equal(1);
          db.medic.get.args[0].should.deep.equal(['id', { open_revs: ['a', 'b', 'c'] }]);
        });
    });

    it('throws error when open_revs is incorrect', () => {
      db.medic.get.rejects({ error: 'bad_request', reason: 'invalid UTF-8 JSON' });
      return service
        .filterOfflineOpenRevsRequest(userCtx, params, query)
        .catch(err => {
          db.medic.get.callCount.should.equal(1);
          err.should.deep.equal({ error: 'bad_request', reason: 'invalid UTF-8 JSON' });
        });
    });

    it('filters allowed docs', () => {
      db.medic.get.resolves([
        { ok: { _id: 'id', _rev: 1 } },
        { ok: { _id: 'id', _rev: 2 } },
        { missing: 3 },
        { ok: { _id: 'id', _rev: 4 } },
        { ok: { _id: 'id', _rev: 5 } },
        { ok: { _id: 'id', _rev: 6, _deleted: true } },
        { error: { _id: 'id', _rev: 7 } }
      ]);

      authorization.getViewResults.callsFake(doc => doc?._rev);
      authorization.allowedDoc.withArgs('id', sinon.match.any, 1).returns(true);
      authorization.allowedDoc.withArgs('id', sinon.match.any, 2).returns(false);
      authorization.allowedDoc.withArgs('id', sinon.match.any, 4).returns(false);
      authorization.allowedDoc.withArgs('id', sinon.match.any, 5).returns(true);
      authorization.allowedDoc.withArgs('id', sinon.match.any, 6).returns(false);
      authorization.getScopedAuthorizationContext.resolves({ userCtx, subjectIds: [ 1, 5 ] });

      return service
        .filterOfflineOpenRevsRequest(userCtx, params, query)
        .then(result => {
          result.should.deep.equal([
            { ok: { _id: 'id', _rev: 1 } },
            { ok: { _id: 'id', _rev: 5 } },
          ]);

          authorization.getViewResults.callCount.should.equal(5);
          authorization.allowedDoc.callCount.should.equal(5);
          authorization.getScopedAuthorizationContext.callCount.should.equal(1);
          authorization.getScopedAuthorizationContext.args[0].should.deep.equal([
            userCtx,
            [
              { doc: { _id: 'id', _rev: 1 }, viewResults: 1 },
              { doc: { _id: 'id', _rev: 2 }, viewResults: 2 },
              undefined,
              { doc: { _id: 'id', _rev: 4 }, viewResults: 4 },
              { doc: { _id: 'id', _rev: 5 }, viewResults: 5 },
              { doc: { _id: 'id', _rev: 6, _deleted: true }, viewResults: 6 },
              undefined,
            ],
          ]);
        });
    });
  });

});
