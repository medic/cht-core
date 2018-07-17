const service = require('../../../src/services/all-docs');
const db = require('../../../src/db-pouch');
const sinon = require('sinon').sandbox.create();
require('chai').should();

const authorization = require('../../../src/services/authorization');

let userCtx,
    query,
    body;

describe('All Docs service', () => {
  beforeEach(function() {
    userCtx = { name: 'user' };
    query = {};
    body = {};

    sinon.stub(authorization, 'getAuthorizationContext').resolves({});
    sinon.stub(authorization, 'getAllowedDocIds').resolves([]);
    sinon.stub(authorization, 'excludeTombstoneIds').callsFake(list => list);
    sinon.stub(authorization, 'convertTombstoneIds').callsFake(list => list);
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
      query = { keys: JSON.stringify(['a', 'b', 'c']) };
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
      let response;
      const allowedIds = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'aa', 'bb', 'cc', 'dd', 'ee'];

      response = service._filterRequestIds(
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

      response = service._filterRequestIds(allowedIds, null, { endkey_docid: 'd', inclusive_end: 'false'});
      response.length.should.equal(6);
      response.should.deep.equal(['a', 'b', 'c', 'aa', 'bb', 'cc']);

      response = service._filterRequestIds(allowedIds, null, { endkey_docid: 'd', inclusive_end: 'true'});
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
        .catch(err => {
          err.message.should.deep.equal('something');
        });
    });

    it('throws authorization errors', () => {
      authorization.getAllowedDocIds.rejects(new Error('something'));

      return service
        .filterOfflineRequest(userCtx, query, body)
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

    it('excludes tombstone ids from allowed ids list when request has no `keys` parameter', () => {
      authorization.getAuthorizationContext.resolves({ subjectIds: ['a', 'b'] });
      authorization.getAllowedDocIds.resolves(['a', 'b', 'tombstone1', 'tombstone2']);
      authorization.excludeTombstoneIds.withArgs(['a', 'b', 'tombstone1', 'tombstone2']).returns(['a', 'b']);

      return service
        .filterOfflineRequest(userCtx, query, body)
        .then(() => {
          authorization.excludeTombstoneIds.callCount.should.equal(1);
          authorization.excludeTombstoneIds.args[0][0].should.deep.equal(['a', 'b', 'tombstone1', 'tombstone2']);
          authorization.convertTombstoneIds.callCount.should.equal(0);
          db.medic.allDocs.args[0][0].keys.should.deep.equal(['a', 'b']);
        });
    });

    it('converts tombstone ids from allowed ids list when request has `keys` parameter', () => {
      authorization.getAuthorizationContext.resolves({ subjectIds: ['a', 'b'] });
      authorization.getAllowedDocIds.resolves(['a', 'b', 'tombstone1', 'tombstone2']);
      authorization.convertTombstoneIds.withArgs(['a', 'b', 'tombstone1', 'tombstone2']).returns(['a', 'b', '1', '2']);
      body = { keys: ['1', '2', '3', '4'] };

      return service
        .filterOfflineRequest(userCtx, query, body)
        .then(() => {
          authorization.excludeTombstoneIds.callCount.should.equal(0);
          authorization.convertTombstoneIds.callCount.should.equal(1);
          authorization.convertTombstoneIds.args[0][0].should.deep.equal(['a', 'b', 'tombstone1', 'tombstone2']);
          db.medic.allDocs.args[0][0].keys.should.deep.equal(['1', '2']);
        });
    });

    it('throws allDocs errors', () => {
      db.medic.allDocs.rejects(new Error('something'));
      authorization.getAllowedDocIds.resolves([1, 2, 3, 4]);

      return service
        .filterOfflineRequest(userCtx, query, body)
        .catch(err => {
          err.message.should.deep.equal('something');
        });
    });

    it('calls db.allDocs with full parameter list', () => {
      query = {
        conflicts: 'something',
        descending: 'else',
        skip: 'skip',
        stale: 'notsomuch',
        update_seq: 'figure',
        limit: 'limit',
        include_docs: 'sometimes'
      };
      authorization.getAllowedDocIds.returns(['a', 'b', 'c']);

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
            include_docs: 'sometimes',
            keys: ['a', 'b', 'c']
          });
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
          result.should.deep.equal([{ id: 'a' }, { id: 'b' }]);
        });
    });

    it('populates response when specific keys are requested', () => {
      authorization.getAllowedDocIds.resolves(['a', 'c', 'f', 'g']);
      db.medic.allDocs.resolves({rows :[{ id: 'a' }, { id: 'c' }]});
      query.keys = JSON.stringify(['a', 'b', 'c', 'd']);

      return service
        .filterOfflineRequest(userCtx, query, body)
        .then(result => {
          db.medic.allDocs.callCount.should.equal(1);
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
  });
});
