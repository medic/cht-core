const service = require('../../../src/services/all-docs');
const db = require('../../../src/db');
const sinon = require('sinon');
require('chai').should();

const authorization = require('../../../src/services/authorization');

let userCtx;
let query;
let body;
let defaultDocs;

describe('All Docs service', () => {
  beforeEach(function() {
    userCtx = { name: 'user' };
    query = {};
    body = {};
    defaultDocs = ['ddoc', 'user', 'settings'];
    sinon.stub(authorization, 'getDefaultDocs').returns(defaultDocs);

    sinon.stub(db.medic, 'allDocs').resolves({ rows: [] });
  });

  afterEach(function() {
    sinon.restore();
  });

  describe('Filter Offline Request', () => {
    it('throws authorization errors', () => {
      authorization.getDefaultDocs.throws(new Error('something'));
      return service
        .filterOfflineRequest(userCtx, query, body)
        .then(result => result.should.equal('should have thrown'))
        .catch(err => {
          err.message.should.deep.equal('something');
        });
    });

    it('calls authorization.getDefaultDocs with correct parameters', () => {
      return service
        .filterOfflineRequest(userCtx, query, body)
        .then(() => {
          authorization.getDefaultDocs.callCount.should.equal(1);
          authorization.getDefaultDocs.args[0][0].should.equal(userCtx);
        });
    });

    it('throws allDocs errors', () => {
      db.medic.allDocs.rejects(new Error('something'));

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

      return service
        .filterOfflineRequest(userCtx, query, body)
        .then(() => {
          db.medic.allDocs.callCount.should.equal(1);
          db.medic.allDocs.args[0][0].should.deep.equal({
            conflicts: true,
            descending: false,
            stale: 'false',
            update_seq: 'figure',
            include_docs: 'sometimes',
            keys: defaultDocs
          });
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
            stale: 'notsomuch',
            update_seq: 'figure',
            keys: defaultDocs,
            include_docs: 'sometimes'
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

      return service
        .filterOfflineRequest(userCtx, query, body)
        .then(() => {
          db.medic.allDocs.callCount.should.equal(1);
          db.medic.allDocs.args[0][0].should.deep.equal({
            conflicts: 'something',
            descending: 'else',
            keys: defaultDocs
          });
        });
    });

    it('forwards db.allDocs response', () => {
      db.medic.allDocs.resolves([{ id: 'a' }, { id: 'b' }]);

      return service
        .filterOfflineRequest(userCtx, query, body)
        .then(result => {
          db.medic.allDocs.callCount.should.equal(1);
          result.should.deep.equal([{ id: 'a' }, { id: 'b' }]);
        });
    });

    it('filters request without keys', () => {
      const allDocsResponse = { rows: [{_id: 'a'}, {_id: 'b'}, {_id: 'c'}, {_id: 'd'}] };
      db.medic.allDocs.withArgs({ keys: defaultDocs }).resolves(allDocsResponse);

      return service
        .filterOfflineRequest(userCtx, query, body)
        .then(result => {
          db.medic.allDocs.callCount.should.equal(1);
          db.medic.allDocs.args[0][0].should.deep.equal({ keys: defaultDocs });

          result.should.deep.equal(allDocsResponse);
        });
    });

    it('filters request with keys', () => {
      db.medic.allDocs
        .withArgs({ keys: defaultDocs })
        .resolves({ rows: [{id: 'b'}, {id: 'c'}, {id: 'd'}] });

      body = { keys: ['a', 'aa', 'b', 'bb', 'c', 'd', 'f', 'g'] };

      return service
        .filterOfflineRequest(userCtx, query, body)
        .then(result => {
          db.medic.allDocs.callCount.should.equal(1);
          db.medic.allDocs.args[0][0].should.deep.equal({ keys: defaultDocs });

          result.should.deep.equal({ rows: [{id: 'b'}, {id: 'c'}, {id: 'd'}] });
        });
    });

    describe('when including docs with keys', () => {
      it('should query _all_docs with default keys', () => {
        const ids = ['a', 'b', 'c', 'd', 'e'];
        db.medic.allDocs
          .resolves({ rows: defaultDocs.map(id => ({ id, doc: { _id: id } })) });

        body = { keys: ids  };
        query = { include_docs: true };

        return service
          .filterOfflineRequest(userCtx, query, body)
          .then(result => {
            result.should.deep.equal({ rows: defaultDocs.map(id => ({ id, doc: { _id: id } })) });
          });
      });

    });
  });
});
