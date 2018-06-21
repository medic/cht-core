const service = require('../../../src/services/all-docs');
const db = require('../../../src/db-pouch');
const sinon = require('sinon').sandbox.create();
require('chai').should();

const authorization = require('../../../src/services/authorization');
const serverUtils = require('../../../src/server-utils');

let testRes,
    testReq;

describe('All Docs service', () => {
  beforeEach(function() {
    testRes = {
      write: sinon.stub(),
      end: sinon.stub(),
      type: sinon.stub(),
      setHeader: () => {}
    };

    testReq = { query: {}, userCtx: { name: 'user' } };

    sinon.stub(authorization, 'getUserAuthorizationData').resolves({});
    sinon.stub(authorization, 'getAllowedDocIds').resolves([]);
    sinon.stub(authorization, 'excludeTombstoneIds').callsFake(list => list);
    sinon.stub(authorization, 'convertTombstoneIds').callsFake(list => list);
    sinon.stub(serverUtils, 'serverError');
    sinon.stub(db.medic, 'allDocs').resolves([]);
  });

  afterEach(function() {
    sinon.restore();
  });

  describe('Get Request Ids', () => {
    it('returns request key parameter', () => {
      testReq = {
        query: { key: 'a' }
      };

      const response = service._getRequestIds(testReq);
      response.length.should.equal(1);
      response.should.deep.equal(['a']);
    });

    it('returns query keys for GET requests', () => {
      testReq = {
        query: { keys: JSON.stringify(['a', 'b', 'c']) },
        method: 'GET'
      };

      const response = service._getRequestIds(testReq);
      response.length.should.equal(3);
      response.should.deep.equal(['a', 'b', 'c']);
    });

    it('returns post keys for POST request', () => {
      testReq = {
        method: 'POST',
        body: { keys: ['a', 'b', 'c'] }
      };

      const response = service._getRequestIds(testReq);
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
  });

  describe('invalidRequest', () => {
    it('returns error when request query `keys` is not JSON', () => {
      testReq.query.keys = 'abcd';
      service._invalidRequest(testReq).should.deep.equal({ error: 'bad_request', reason: 'invalid UTF-8 JSON' });
    });

    it('returns error when request query `keys` is not an array', () => {
      testReq.query.keys = JSON.stringify({ some: 'thing' });
      service._invalidRequest(testReq).should.deep.equal(
        { error: 'bad_request', reason: '`keys` parameter must be an array.' });
    });

    it('returns error when request body `keys` is not an array array', () => {
      testReq.body = { keys: 'something' };
      testReq.method = 'POST';
      service._invalidRequest(testReq).should.deep.equal(
        { error: 'bad_request', reason: '`keys` body member must be an array.' });
    });

    it('returns false otherwise', () => {
      service._invalidRequest({}).should.equal(false);
      service._invalidRequest({query: { keys: JSON.stringify([1, 2]) }}).should.equal(false);
      service._invalidRequest({body: { keys: [1, 2] }}).should.equal(false);
    });
  });

  describe('Filter Offline Request', () => {
    it('catches authorization errors', () => {
      authorization.getUserAuthorizationData.rejects({ error: 'something' });

      return service
        .filterOfflineRequest(testReq, testRes)
        .then(() => {
          serverUtils.serverError.callCount.should.equal(1);
          serverUtils.serverError.args[0][0].should.deep.equal({ error: 'something' });
        });
    });

    it('catches authorization errors', () => {
      authorization.getAllowedDocIds.rejects({ error: 'something' });

      return service
        .filterOfflineRequest(testReq, testRes)
        .then(() => {
          serverUtils.serverError.callCount.should.equal(1);
          serverUtils.serverError.args[0][0].should.deep.equal({ error: 'something' });
        });
    });

    it('calls authorization.getUserAuthorizationData with correct parameters', () => {
      return service
        .filterOfflineRequest(testReq, testRes)
        .then(() => {
          authorization.getUserAuthorizationData.callCount.should.equal(1);
          authorization.getUserAuthorizationData.args[0][0].should.equal(testReq.userCtx);
        });
    });

    it('calls authorization.getAllowedIds with correct parameters', () => {
      authorization.getUserAuthorizationData.resolves({ subjectIds: ['a', 'b'] });
      authorization.getAllowedDocIds.resolves(['a', 'b']);
      db.medic.allDocs.rejects({ error: 'something' });

      return service
        .filterOfflineRequest(testReq, testRes)
        .then(() => {
          authorization.getAllowedDocIds.callCount.should.equal(1);
          authorization.getAllowedDocIds.args[0].should.deep.equal([{
            subjectIds: ['a', 'b'],
            userCtx: testReq.userCtx
          }]);
        });
    });

    it('excludes tombstone ids from allowed ids list when request has no `keys` parameter', () => {
      authorization.getUserAuthorizationData.resolves({ subjectIds: ['a', 'b'] });
      authorization.getAllowedDocIds.resolves(['a', 'b', 'tombstone1', 'tombstone2']);
      authorization.excludeTombstoneIds.withArgs(['a', 'b', 'tombstone1', 'tombstone2']).returns(['a', 'b']);

      return service
        .filterOfflineRequest(testReq, testRes)
        .then(() => {
          authorization.excludeTombstoneIds.callCount.should.equal(1);
          authorization.excludeTombstoneIds.args[0][0].should.deep.equal(['a', 'b', 'tombstone1', 'tombstone2']);
          authorization.convertTombstoneIds.callCount.should.equal(0);
          db.medic.allDocs.args[0][0].keys.should.deep.equal(['a', 'b']);
        });
    });

    it('converts tombstone ids from allowed ids list when request has `keys` parameter', () => {
      authorization.getUserAuthorizationData.resolves({ subjectIds: ['a', 'b'] });
      authorization.getAllowedDocIds.resolves(['a', 'b', 'tombstone1', 'tombstone2']);
      authorization.convertTombstoneIds.withArgs(['a', 'b', 'tombstone1', 'tombstone2']).returns(['a', 'b', '1', '2']);
      testReq.body = { keys: ['1', '2', '3', '4'] };

      return service
        .filterOfflineRequest(testReq, testRes)
        .then(() => {
          authorization.excludeTombstoneIds.callCount.should.equal(0);
          authorization.convertTombstoneIds.callCount.should.equal(1);
          authorization.convertTombstoneIds.args[0][0].should.deep.equal(['a', 'b', 'tombstone1', 'tombstone2']);
          db.medic.allDocs.args[0][0].keys.should.deep.equal(['1', '2']);
        });
    });

    it('catches allDocs errors', () => {
      db.medic.allDocs.rejects({ error: 'something' });

      return service
        .filterOfflineRequest(testReq, testRes)
        .then(() => {
          serverUtils.serverError.callCount.should.equal(1);
          serverUtils.serverError.args[0][0].should.deep.equal({ error: 'something' });
        });
    });

    it('calls db.allDocs with full parameter list', () => {
      testReq.query = {
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
        .filterOfflineRequest(testReq, testRes)
        .then(() => {
          serverUtils.serverError.callCount.should.equal(0);
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
      testReq.query = {
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
        .filterOfflineRequest(testReq, testRes)
        .then(() => {
          serverUtils.serverError.callCount.should.equal(0);
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
        .filterOfflineRequest(testReq, testRes)
        .then(() => {
          serverUtils.serverError.callCount.should.equal(0);
          db.medic.allDocs.callCount.should.equal(1);
          testRes.write.callCount.should.equal(1);
          testRes.write.args[0][0].should.equal(JSON.stringify([{ id: 'a' }, { id: 'b' }]));
        });
    });

    it('populates response when specific keys are requested', () => {
      authorization.getAllowedDocIds.resolves(['a', 'c', 'f', 'g']);
      db.medic.allDocs.resolves({rows :[{ id: 'a' }, { id: 'c' }]});
      testReq.query.keys = JSON.stringify(['a', 'b', 'c', 'd']);
      testReq.method = 'GET';

      return service
        .filterOfflineRequest(testReq, testRes)
        .then(() => {
          db.medic.allDocs.callCount.should.equal(1);
          testRes.write.callCount.should.equal(1);
          testRes.write.args[0][0].should.equal(JSON.stringify({ rows: [
              { id: 'a' },
              { id: 'b', error: 'forbidden' },
              { id: 'c' },
              { id: 'd', error: 'forbidden' }
            ]}));
        });
    });

    it('filters request without keys', () => {
      const docIds = ['a', 'b', 'c', 'd'];
      const allDocsResponse = { rows: [{_id: 'a'}, {_id: 'b'}, {_id: 'c'}, {_id: 'd'}] };
      authorization.getAllowedDocIds.resolves(docIds);
      db.medic.allDocs.withArgs({ keys: docIds }).resolves(allDocsResponse);

      return service
        .filterOfflineRequest(testReq, testRes)
        .then(() => {
          db.medic.allDocs.callCount.should.equal(1);
          db.medic.allDocs.args[0][0].should.deep.equal({ keys: docIds });

          testRes.write.callCount.should.equal(1);
          testRes.write.args[0][0].should.equal(JSON.stringify(allDocsResponse));
        });
    });

    it('filters request with keys', () => {
      authorization.getAllowedDocIds.resolves(['b', 'c', 'd', 'e']);
      db.medic.allDocs
        .withArgs({ keys: ['b', 'c', 'd'] })
        .resolves({ rows: [{id: 'b'}, {id: 'c'}, {id: 'd'}] });

      testReq.method = 'POST';
      testReq.body = { keys: ['a', 'aa', 'b', 'bb', 'c', 'd', 'f', 'g'] };

      return service
        .filterOfflineRequest(testReq, testRes)
        .then(() => {
          db.medic.allDocs.callCount.should.equal(1);
          db.medic.allDocs.args[0][0].should.deep.equal({ keys: ['b', 'c', 'd'] });

          testRes.write.callCount.should.equal(1);
          testRes.write.args[0][0].should.equal(JSON.stringify({
            rows: [
              {id: 'a', error: 'forbidden'},
              {id: 'aa', error: 'forbidden'},
              {id: 'b'},
              {id: 'bb', error: 'forbidden'},
              {id: 'c'}, {id: 'd'},
              {id: 'f', error: 'forbidden'},
              {id: 'g', error: 'forbidden'}
              ]
          }));
        });
    });

    it('handles POST requests with non-array `keys` body parameter', () => {
      testReq.method = 'POST';
      testReq.body = { keys: 'aaaaa' };

      return Promise
        .all([
          service.filterOfflineRequest(testReq, testRes),
          Promise.resolve()
        ])
        .then(() => {
          authorization.getUserAuthorizationData.callCount.should.equal(0);
          testRes.type.callCount.should.equal(1);
          testRes.write.callCount.should.equal(1);
          testRes.end.callCount.should.equal(1);
          JSON.parse(testRes.write.args[0][0]).error.should.equal('bad_request');
        });
    });

    it('handles requests with non-json `keys` query parameter', () => {
      testReq.query.keys = 'aaaa';

      return Promise
        .all([
          service.filterOfflineRequest(testReq, testRes),
          Promise.resolve()
        ])
        .then(() => {
          authorization.getUserAuthorizationData.callCount.should.equal(0);
          testRes.type.callCount.should.equal(1);
          testRes.write.callCount.should.equal(1);
          testRes.end.callCount.should.equal(1);
          JSON.parse(testRes.write.args[0][0]).error.should.equal('bad_request');
        });
    });

    it('handles requests with non-array `keys` query parameter', () => {
      testReq.query.keys = JSON.stringify({ some: 'thing' });

      return Promise
        .all([
          service.filterOfflineRequest(testReq, testRes),
          Promise.resolve()
        ])
        .then(() => {
          authorization.getUserAuthorizationData.callCount.should.equal(0);
          testRes.type.callCount.should.equal(1);
          testRes.write.callCount.should.equal(1);
          testRes.end.callCount.should.equal(1);
          JSON.parse(testRes.write.args[0][0]).error.should.equal('bad_request');
        });
    });
  });
});
