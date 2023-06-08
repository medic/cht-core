const service = require('../../../src/services/all-docs');
const db = require('../../../src/db');
const sinon = require('sinon');
require('chai').should();

const authorization = require('../../../src/services/authorization');

let userCtx;
let query;
let body;

describe('All Docs service', () => {
  beforeEach(function() {
    userCtx = { name: 'user' };
    query = {};
    body = {};

    sinon.stub(authorization, 'getAuthorizationContext').resolves({});
    sinon.stub(authorization, 'getAllowedDocIds').resolves([]);
    sinon.stub(db.medic, 'allDocs').resolves([]);
  });

  afterEach(function() {
    sinon.restore();
  });

  describe('Get Request Ids', () => {
    it('returns request key parameter', () => {
      query = { key: 'a' };

      const response = service._getRequestIds(query);
      response.length.should.equal(1);
      response.should.deep.equal(['a']);
    });

    it('returns query keys for GET requests', () => {
      query = { keys: ['a', 'b', 'c'] };
      const response = service._getRequestIds(query);
      response.length.should.equal(3);
      response.should.deep.equal(['a', 'b', 'c']);
    });

    it('returns post keys for POST request', () => {
      body = { keys: ['a', 'b', 'c'] };
      const response = service._getRequestIds(query, body);
      response.length.should.equal(3);
      response.should.deep.equal(['a', 'b', 'c']);
    });
  });

  describe('Filter Request Ids', () => {
    it('returns all allowed ids when no specific ids are requested', () => {
      const response = service._filterRequestIds(['a', 'b', 'c'], null, {});
      response.length.should.equal(3);
      response.should.deep.equal(['a', 'b', 'c']);
    });

    it('returns the intersection of request ids and allowed ids', () => {
      const requestIds = ['a', 'b', 'c', 'd', 'e'];
      const allowedIds = ['a', 'c', 'e', 'f', 'g'];
      const response = service._filterRequestIds(allowedIds, requestIds, {});
      response.length.should.equal(3);
      response.should.deep.equal(['a', 'c', 'e']);
    });

    it('filters the allowed ids by `startkey`, `start_key`, `startkey_docid`, `start_key_doc_id` param', () => {
      let response;
      const allowedIds = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'aa', 'bb', 'cc', 'dd', 'ee'];

      response = service._filterRequestIds(allowedIds, null, { startkey: 'c' });
      response.length.should.equal(12);
      response.should.deep.equal(['c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'cc', 'dd', 'ee']);

      response = service._filterRequestIds(allowedIds, null, { start_key: 'd' });
      response.length.should.equal(10);
      response.should.deep.equal(['d', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'dd', 'ee']);

      response = service._filterRequestIds(allowedIds, null, { startkey_docid: 'c' });
      response.length.should.equal(12);
      response.should.deep.equal(['c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'cc', 'dd', 'ee']);

      response = service._filterRequestIds(allowedIds, null, { start_key_doc_id: 'e' });
      response.length.should.equal(8);
      response.should.deep.equal(['e', 'f', 'g', 'h', 'i', 'j', 'k', 'ee']);
    });

    it('only takes last `startkey` alias param into consideration', () => {
      const allowedIds = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'aa', 'bb', 'cc', 'dd', 'ee'];

      const response = service._filterRequestIds(
        allowedIds,
        null,
        { startkey: 'c', start_key_doc_id: 'a', startkey_docid: 'b', start_key: 'd' });
      response.length.should.equal(10);
      response.should.deep.equal(['d', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'dd', 'ee']);
    });

    it('filters the allowed ids by `endkey`, `end_key`, `endkey_docid`, `end_key_doc_id` param', () => {
      let response;
      const allowedIds = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'aa', 'bb', 'cc', 'dd', 'ee'];

      response = service._filterRequestIds(allowedIds, null, { endkey: 'e' });
      response.length.should.equal(9);
      response.should.deep.equal(['a', 'b', 'c', 'd', 'e', 'aa', 'bb', 'cc', 'dd']);

      response = service._filterRequestIds(allowedIds, null, { end_key: 'd' });
      response.length.should.equal(7);
      response.should.deep.equal(['a', 'b', 'c', 'd', 'aa', 'bb', 'cc']);

      response = service._filterRequestIds(allowedIds, null, { endkey_docid: 'f' });
      response.length.should.equal(11);
      response.should.deep.equal(['a', 'b', 'c', 'd', 'e', 'f', 'aa', 'bb', 'cc', 'dd', 'ee']);

      response = service._filterRequestIds(allowedIds, null, { end_key_doc_id: 'x' });
      response.length.should.equal(16);
      response.should.deep.equal(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'aa', 'bb', 'cc', 'dd', 'ee']);
    });

    it('only takes last `endkey` alias param into consideration', () => {
      const allowedIds = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'aa', 'bb', 'cc', 'dd', 'ee'];

      const response = service._filterRequestIds(
        allowedIds,
        null,
        { endkey: 'c', end_key_doc_id: 'a', end_key: 'b', endkey_docid: 'd' });
      response.length.should.equal(7);
      response.should.deep.equal(['a', 'b', 'c', 'd', 'aa', 'bb', 'cc']);
    });

    it('respects `inclusive_end` param', () => {
      let response;
      const allowedIds = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'aa', 'bb', 'cc', 'dd', 'ee'];

      response = service._filterRequestIds(allowedIds, null, { endkey_docid: 'd', inclusive_end: false});
      response.length.should.equal(6);
      response.should.deep.equal(['a', 'b', 'c', 'aa', 'bb', 'cc']);

      response = service._filterRequestIds(allowedIds, null, { endkey_docid: 'd', inclusive_end: true});
      response.length.should.equal(7);
      response.should.deep.equal(['a', 'b', 'c', 'd', 'aa', 'bb', 'cc']);
    });

    it('ignores `startKey`/`endKey` when specific `keys` are requested', () => {
      const requestIds = ['a', 'b', 'c', 'd', 'e'];
      const allowedIds = ['a', 'c', 'e', 'f', 'g'];
      const response = service._filterRequestIds(allowedIds, requestIds, { start_key: '7', end_key: '22' });
      response.length.should.equal(3);
      response.should.deep.equal(['a', 'c', 'e']);
    });

    it('filters allowedIds by `startKey` and `endKey`', () => {
      const allowedIds = [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15];
      const response = service._filterRequestIds(allowedIds, null, { start_key: 3, end_key: 10 });
      response.length.should.equal(6);
      response.should.deep.equal([3, 5, 6, 7, 9, 10]);
    });
  });

  describe('Filter Offline Request', () => {
    it('throws authorization errors', () => {
      authorization.getAuthorizationContext.rejects(new Error('something'));
      return service
        .filterOfflineRequest(userCtx, query, body)
        .then(result => result.should.equal('should have thrown'))
        .catch(err => {
          err.message.should.deep.equal('something');
        });
    });

    it('throws authorization errors', () => {
      authorization.getAllowedDocIds.rejects(new Error('something'));

      return service
        .filterOfflineRequest(userCtx, query, body)
        .then(result => result.should.equal('should have thrown'))
        .catch(err => {
          err.message.should.deep.equal('something');
        });
    });

    it('calls authorization.getAuthorizationContext with correct parameters', () => {
      return service
        .filterOfflineRequest(userCtx, query, body)
        .then(() => {
          authorization.getAuthorizationContext.callCount.should.equal(1);
          authorization.getAuthorizationContext.args[0][0].should.equal(userCtx);
        });
    });

    it('calls authorization.getAllowedIds with correct parameters', () => {
      authorization.getAuthorizationContext.resolves({ subjectIds: ['a', 'b'], userCtx: userCtx });
      authorization.getAllowedDocIds.resolves(['a', 'b']);

      return service
        .filterOfflineRequest(userCtx, query, body)
        .then(() => {
          authorization.getAllowedDocIds.callCount.should.equal(1);
          authorization.getAllowedDocIds.args[0].should.deep.equal([{
            subjectIds: ['a', 'b'],
            userCtx: userCtx
          }]);
        });
    });

    it('throws allDocs errors', () => {
      db.medic.allDocs.rejects(new Error('something'));
      authorization.getAllowedDocIds.resolves([1, 2, 3, 4]);

      return service
        .filterOfflineRequest(userCtx, query, body)
        .then(result => result.should.equal('should have thrown'))
        .catch(err => {
          err.message.should.deep.equal('something');
        });
    });

    it('calls db.allDocs with full parameter list', () => {
      query = {
        conflicts: true,
        descending: false,
        skip: 'skip',
        stale: 'false',
        update_seq: 'figure',
        limit: 'limit',
        include_docs: 'sometimes'
      };
      authorization.getAllowedDocIds.resolves(['a', 'b', 'c']);

      return service
        .filterOfflineRequest(userCtx, query, body)
        .then(() => {
          db.medic.allDocs.callCount.should.equal(1);
          db.medic.allDocs.args[0][0].should.deep.equal({
            conflicts: true,
            descending: false,
            skip: 'skip',
            stale: 'false',
            update_seq: 'figure',
            limit: 'limit',
            include_docs: 'sometimes',
            keys: ['a', 'b', 'c']
          });

          authorization.getAllowedDocIds.callCount.should.equal(1);
        });
    });

    it('calls db.allDocs with full parameter list when including docs', () => {
      query = {
        conflicts: 'something',
        descending: 'else',
        skip: 'skip',
        stale: 'notsomuch',
        update_seq: 'figure',
        limit: 'limit',
        include_docs: 'sometimes',
        keys: ['a', 'b']
      };

      db.medic.allDocs.resolves({ rows: [] });

      return service
        .filterOfflineRequest(userCtx, query, body)
        .then(() => {
          db.medic.allDocs.callCount.should.equal(1);
          db.medic.allDocs.args[0][0].should.deep.equal({
            conflicts: 'something',
            descending: 'else',
            skip: 'skip',
            stale: 'notsomuch',
            update_seq: 'figure',
            limit: 'limit',
            keys: ['a', 'b'],
            include_docs: 'sometimes'
          });

          authorization.getAllowedDocIds.callCount.should.equal(0);
        });
    });

    it('removes incompatible parameters from db.allDocs call', () => {
      query = {
        conflicts: 'something',
        descending: 'else',
        skip: 'skip',
        endkey: 10,
        end_key_doc_id: 'c',
        key: 'b',
        startkey: 2,
        start_key: 3,
        start_key_doc_id: 'a',
      };
      authorization.getAllowedDocIds.resolves(['a', 'b']);

      return service
        .filterOfflineRequest(userCtx, query, body)
        .then(() => {
          db.medic.allDocs.callCount.should.equal(1);
          db.medic.allDocs.args[0][0].should.deep.equal({
            conflicts: 'something',
            descending: 'else',
            skip: 'skip',
            keys: ['b']
          });
        });
    });

    it('forwards db.allDocs response', () => {
      authorization.getAllowedDocIds.resolves(['a', 'b']);
      db.medic.allDocs.resolves([{ id: 'a' }, { id: 'b' }]);

      return service
        .filterOfflineRequest(userCtx, query, body)
        .then(result => {
          db.medic.allDocs.callCount.should.equal(1);
          authorization.getAllowedDocIds.callCount.should.equal(1);
          result.should.deep.equal([{ id: 'a' }, { id: 'b' }]);
        });
    });

    it('populates response when specific keys are requested', () => {
      authorization.getAllowedDocIds.resolves(['a', 'c', 'f', 'g']);
      db.medic.allDocs.resolves({rows :[{ id: 'a' }, { id: 'c' }]});
      query.keys = ['a', 'b', 'c', 'd'];

      return service
        .filterOfflineRequest(userCtx, query, body)
        .then(result => {
          db.medic.allDocs.callCount.should.equal(1);
          authorization.getAllowedDocIds.callCount.should.equal(1);
          result.should.deep.equal({ rows: [
            { id: 'a' },
            { id: 'b', error: 'forbidden' },
            { id: 'c' },
            { id: 'd', error: 'forbidden' }
          ]});
        });
    });

    it('filters request without keys', () => {
      const docIds = ['a', 'b', 'c', 'd'];
      const allDocsResponse = { rows: [{_id: 'a'}, {_id: 'b'}, {_id: 'c'}, {_id: 'd'}] };
      authorization.getAllowedDocIds.resolves(docIds);
      db.medic.allDocs.withArgs({ keys: docIds }).resolves(allDocsResponse);

      return service
        .filterOfflineRequest(userCtx, query, body)
        .then(result => {
          db.medic.allDocs.callCount.should.equal(1);
          db.medic.allDocs.args[0][0].should.deep.equal({ keys: docIds });
          authorization.getAllowedDocIds.callCount.should.equal(1);

          result.should.deep.equal(allDocsResponse);
        });
    });

    it('filters request with keys', () => {
      authorization.getAllowedDocIds.resolves(['b', 'c', 'd', 'e']);
      db.medic.allDocs
        .withArgs({ keys: ['b', 'c', 'd'] })
        .resolves({ rows: [{id: 'b'}, {id: 'c'}, {id: 'd'}] });

      body = { keys: ['a', 'aa', 'b', 'bb', 'c', 'd', 'f', 'g'] };

      return service
        .filterOfflineRequest(userCtx, query, body)
        .then(result => {
          db.medic.allDocs.callCount.should.equal(1);
          db.medic.allDocs.args[0][0].should.deep.equal({ keys: ['b', 'c', 'd'] });
          authorization.getAllowedDocIds.callCount.should.equal(1);

          result.should.deep.equal({ rows: [
            {id: 'a', error: 'forbidden'},
            {id: 'aa', error: 'forbidden'},
            {id: 'b'},
            {id: 'bb', error: 'forbidden'},
            {id: 'c'}, {id: 'd'},
            {id: 'f', error: 'forbidden'},
            {id: 'g', error: 'forbidden'}
          ]});
        });
    });

    describe('when including docs with keys', () => {
      it('should query _all_docs with requested keys and filter results', () => {
        const ids = ['a', 'b', 'c', 'd', 'e'];
        db.medic.allDocs
          .withArgs({ keys: ids, include_docs: true })
          .resolves({ rows: ids.map(id => ({ id, doc: { _id: id } })) });

        body = { keys: ids  };
        query = { include_docs: true };

        sinon.stub(authorization, 'getViewResults').callsFake(doc => ({ view: true, id: doc._id }));
        sinon.stub(authorization, 'allowedDoc').returns(false);
        authorization.allowedDoc.withArgs('a').returns(true);
        authorization.allowedDoc.withArgs('d').returns(true);
        authorization.allowedDoc.withArgs('e').returns(true);

        return service
          .filterOfflineRequest(userCtx, query, body)
          .then(result => {
            authorization.getViewResults.callCount.should.equal(5);
            authorization.allowedDoc.callCount.should.equal(5);
            authorization.allowedDoc.calledWith('a', sinon.match.any, { view: true, doc: 'a' });
            authorization.allowedDoc.calledWith('b', sinon.match.any, { view: true, doc: 'b' });
            authorization.allowedDoc.calledWith('c', sinon.match.any, { view: true, doc: 'c' });
            authorization.allowedDoc.calledWith('d', sinon.match.any, { view: true, doc: 'd' });
            authorization.allowedDoc.calledWith('e', sinon.match.any, { view: true, doc: 'e' });

            result.should.deep.equal({ rows: [
              { id: 'a', doc: { _id: 'a' }},
              { id: 'b', error: 'forbidden' },
              { id: 'c', error: 'forbidden' },
              { id: 'd', doc: { _id: 'd' }},
              { id: 'e', doc: { _id: 'e' }},
            ]});
          });
      });

      it('should fill the gaps for not found docs as well', () => {
        const ids = ['a', 'b', 'c', 'd', 'e'];
        db.medic.allDocs
          .withArgs({ keys: ids, include_docs: true })
          .resolves({ rows: [
            { id: 'a', doc: { _id: 'a' }},
            { id: 'b', doc: null, value: { deleted: true } },
            { id: 'c', doc: { _id: 'c' }},
            { id: 'd', doc: null, value: { deleted: true }},
            { id: 'e', doc: { _id: 'e' }},
          ]});

        body = { keys: ids  };
        query = { include_docs: true };

        sinon.stub(authorization, 'getViewResults').callsFake(doc => ({ view: true, id: doc._id }));
        sinon.stub(authorization, 'allowedDoc').returns(false);
        authorization.allowedDoc.withArgs('a').returns(true);
        authorization.allowedDoc.withArgs('e').returns(true);

        return service
          .filterOfflineRequest(userCtx, query, body)
          .then(result => {
            authorization.getViewResults.callCount.should.equal(3);
            authorization.allowedDoc.callCount.should.equal(3);
            authorization.allowedDoc.calledWith('a', sinon.match.any, { view: true, doc: 'a' });
            authorization.allowedDoc.calledWith('c', sinon.match.any, { view: true, doc: 'c' });
            authorization.allowedDoc.calledWith('e', sinon.match.any, { view: true, doc: 'e' });

            result.should.deep.equal({ rows: [
              { id: 'a', doc: { _id: 'a' }},
              { id: 'b', error: 'forbidden' },
              { id: 'c', error: 'forbidden' },
              { id: 'd', error: 'forbidden' },
              { id: 'e', doc: { _id: 'e' }},
            ]});
          });
      });
    });
  });

  describe('filterAllowedDocs', () => {
    it('should request _all_docs with provided options', () => {
      db.medic.allDocs.resolves({ rows: [] });
      const authCtx = { userCtx: { name: 'mia' } };
      const opts = { include_docs: true, conflicts: true, something: 'else', keys: [1, 2, 3] };

      return service._filterAllowedDocs(authCtx, opts).then(result => {
        db.medic.allDocs.callCount.should.equal(1);
        db.medic.allDocs.args[0].should.deep.equal([opts]);
        result.should.deep.equal({ rows: [] });
      });
    });

    it('should filter response from _all_docs and return allowed docs only', () => {
      const authCtx = { userCtx: { name: 'mia' } };
      const opts = { include_docs: true, keys: [1, 2, 3, 4, 5] };
      db.medic.allDocs.resolves({ rows: [
        { id: 1, doc: { _id: 1, ok: true } },
        { id: 2, doc: { _id: 2, ok: false } },
        { id: 3, doc: null, value: { deleted: true } },
        { id: 4, doc: { _id: 2, ok: true } },
        { id: 5, error: 'missing' },
      ]});
      sinon.stub(authorization, 'getViewResults').callsFake(doc => ({ allowed: doc.ok, id: doc._id }));
      sinon.stub(authorization, 'allowedDoc').callsFake((id, ctx, views) => views.allowed);

      return service._filterAllowedDocs(authCtx, opts).then(result => {
        db.medic.allDocs.callCount.should.equal(1);
        db.medic.allDocs.args[0].should.deep.equal([opts]);

        authorization.getViewResults.callCount.should.equal(3);
        authorization.allowedDoc.callCount.should.equal(3);
        authorization.allowedDoc.calledWith(1, authCtx, { allowed: true, id: 1 });
        authorization.allowedDoc.calledWith(2, authCtx, { allowed: false, id: 2 });
        authorization.allowedDoc.calledWith(4, authCtx, { allowed: true, id: 4 });

        result.should.deep.equal({ rows: [
          { id: 1, doc: { _id: 1, ok: true } },
          { id: 4, doc: { _id: 2, ok: true } }
        ]});
      });
    });

    it('should throw allDocs errors', () => {
      db.medic.allDocs.rejects({ some: 'error' });
      const authCtx = { userCtx: { name: 'mia' } };
      const opts = { include_docs: true, conflicts: true, something: 'else', keys: [1, 2, 3] };

      return service
        ._filterAllowedDocs(authCtx, opts)
        .then(result => result.should.equal('should have thrown'))
        .catch(err => err.should.deep.equal({ some: 'error' }));
    });
  });

  describe('filterAllowedDocIds', () => {
    it('should get allowed doc ids and request all docs with the filtered list', () => {
      authorization.getAllowedDocIds.resolves([1, 2, 3]);
      const authCtx = { userCtx: { name: 'mia' } };
      const opts = { keys: [1, 2, 3, 4, 5, 6] };
      const query = { keys: opts.keys };
      db.medic.allDocs.resolves({ rows: [{ id: 1 }, { id: 2 }, { id: 3 }]});

      return service._filterAllowedDocIds(authCtx, opts, query).then(result => {
        authorization.getAllowedDocIds.callCount.should.equal(1);
        db.medic.allDocs.callCount.should.equal(1);
        db.medic.allDocs.args[0].should.deep.equal([{ keys: [1, 2, 3] }]);
        result.should.deep.equal({ rows: [{ id: 1 }, { id: 2 }, { id: 3 }]});
      });
    });

    it('should throw allDocs errors', () => {
      authorization.getAllowedDocIds.resolves([1, 2, 3]);
      db.medic.allDocs.rejects({ some: 'error' });
      const authCtx = { userCtx: { name: 'mia' } };
      const opts = { };

      return service
        ._filterAllowedDocIds(authCtx, opts, {})
        .then(result => result.should.equal('should have thrown'))
        .catch(err => err.should.deep.equal({ some: 'error' }));
    });
  });
});
