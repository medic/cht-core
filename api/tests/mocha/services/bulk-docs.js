const service = require('../../../src/services/bulk-docs');
const db = require('../../../src/db-pouch');
const sinon = require('sinon');
require('chai').should();

const authorization = require('../../../src/services/authorization');

const testDocs = [
  { _id: 'a' },
  { _id: 'b' },
  { _id: 'c' }
];
let testRes,
    testReq,
    userCtx,
    next;

describe('Bulk Docs Service', function () {
  beforeEach(function() {
    testRes = {
      write: sinon.stub(),
      end: sinon.stub(),
      type: sinon.stub(),
      setHeader: () => {},
      flush: sinon.stub()
    };

    userCtx = { name: 'user' };
    testReq = { userCtx };

    next = sinon.stub();

    sinon.stub(authorization, 'getAuthorizationContext').resolves({});
    sinon.stub(authorization, 'getAllowedDocIds').resolves([]);
    sinon.stub(authorization, 'excludeTombstoneIds').callsFake(list => list);
    sinon.stub(authorization, 'convertTombstoneIds').callsFake(list => list);
    sinon.stub(authorization, 'filterAllowedDocs').returns([]);
    sinon.stub(authorization, 'getViewResults').callsFake(doc => ({ view: doc }));
    sinon.stub(authorization, 'alwaysAllowCreate').returns(false);
  });

  afterEach(function() {
    sinon.restore();
  });

  describe('Bulk Delete', function () {
    it('calls allDocs with correct args', function () {
      sinon.stub(db.medic, 'bulkDocs').resolves([]);
      const allDocs = sinon.stub(db.medic, 'allDocs').resolves({ rows: [] });
      return service.bulkDelete(testDocs, testRes)
        .then(() => {
          allDocs.callCount.should.equal(1);
          allDocs.firstCall.args[0].should.deep.equal({ keys: ['a', 'b', 'c'], include_docs: true });
        });
    });

    it('writes chunked response', function () {
      const docA = { _id: 'a', _rev: '1', type: 'person', parent: { _id: 'parent' } };
      const parent = { _id: 'parent', _rev: '1', contact: { _id: 'a' } };
      const docB = { _id: 'b', _rev: '1' };
      const docC = { _id: 'c', _rev: '1' };
      const expectedA = Object.assign({}, docA, { _deleted: true });
      const expectedParent = Object.assign({}, parent, { contact: null });
      const expectedB = Object.assign({}, docB, { _deleted: true });
      const expectedC = Object.assign({}, docC, { _deleted: true });

      const allDocs = sinon.stub(db.medic, 'allDocs');
      allDocs.onCall(0).resolves({ rows: [{ doc: docA }, { doc: docB }] });
      allDocs.onCall(1).resolves({ rows: [{ doc: docC }] });

      const bulkDocs = sinon.stub(db.medic, 'bulkDocs');
      bulkDocs.onCall(0).resolves([{ id: docA._id, ok: true }, { id: docB._id, ok: true }, { id: parent._id, ok: true }]);
      bulkDocs.onCall(1).resolves([{ id: docC._id, ok: true }]);

      sinon.stub(db.medic, 'get').resolves(parent);

      return service.bulkDelete(testDocs, testRes, { batchSize: 2 })
        .then(() => {
          allDocs.callCount.should.equal(2);
          allDocs.getCall(0).args[0].should.deep.equal({ keys: [docA._id, docB._id], include_docs: true });
          allDocs.getCall(1).args[0].should.deep.equal({ keys: [docC._id], include_docs: true });
          bulkDocs.callCount.should.equal(2);
          bulkDocs.getCall(0).args[0].should.deep.equal([expectedA, expectedB, expectedParent]);
          bulkDocs.getCall(1).args[0].should.deep.equal([expectedC]);
          testRes.write.callCount.should.equal(4);
          testRes.write.getCall(0).args[0].should.equal('[');
          testRes.write.getCall(1).args[0].should.equal('[{"id":"a","ok":true},{"id":"b","ok":true},{"id":"parent","ok":true}],');
          testRes.write.getCall(2).args[0].should.equal('[{"id":"c","ok":true}]');
          testRes.write.getCall(3).args[0].should.equal(']');
          testRes.end.callCount.should.equal(1);
        });
    });

    it('retries deletion failures up to 3 times', function () {
      const docA = { _id: 'a', _rev: '1' };
      const docB = { _id: 'b', _rev: '1' };
      const docC = { _id: 'c', _rev: '1' };
      const expectedA = Object.assign({}, docA, { _deleted: true });
      const expectedB = Object.assign({}, docB, { _deleted: true });
      const expectedC = Object.assign({}, docC, { _deleted: true });

      const allDocs = sinon.stub(db.medic, 'allDocs');
      allDocs.onCall(0).resolves({ rows: [{ doc: docA }, { doc: docB }] });
      allDocs.onCall(1).resolves({ rows: [{ doc: docA }, { doc: docB }] });
      allDocs.onCall(2).resolves({ rows: [{ doc: docB }] });
      allDocs.onCall(3).resolves({ rows: [{ doc: docB }] });
      allDocs.onCall(4).resolves({ rows: [{ doc: docC }] });

      const bulkDocs = sinon.stub(db.medic, 'bulkDocs');
      bulkDocs.onCall(0).resolves([{ id: docA._id, error: true }, { id: docB._id, error: true }]);
      bulkDocs.onCall(1).resolves([{ id: docA._id, ok: true }, { id: docB._id, error: true }]);
      bulkDocs.onCall(2).resolves([{ id: docB._id, error: true }]);
      bulkDocs.onCall(3).resolves([{ id: docB._id, error: true }]);
      bulkDocs.onCall(4).resolves([{ id: docC._id, ok: true }]);

      return service.bulkDelete(testDocs, testRes, { batchSize: 2 })
        .then(() => {
          allDocs.callCount.should.equal(5);
          allDocs.getCall(0).args[0].should.deep.equal({ keys: [docA._id, docB._id], include_docs: true });
          allDocs.getCall(1).args[0].should.deep.equal({ keys: [docA._id, docB._id], include_docs: true });
          allDocs.getCall(2).args[0].should.deep.equal({ keys: [docB._id], include_docs: true });
          allDocs.getCall(3).args[0].should.deep.equal({ keys: [docB._id], include_docs: true });
          allDocs.getCall(4).args[0].should.deep.equal({ keys: [docC._id], include_docs: true });
          bulkDocs.callCount.should.equal(5);
          bulkDocs.getCall(0).args[0].should.deep.equal([expectedA, expectedB]);
          bulkDocs.getCall(1).args[0].should.deep.equal([expectedA, expectedB]);
          bulkDocs.getCall(2).args[0].should.deep.equal([expectedB]);
          bulkDocs.getCall(3).args[0].should.deep.equal([expectedB]);
          bulkDocs.getCall(4).args[0].should.deep.equal([expectedC]);
          testRes.write.callCount.should.equal(4);
          testRes.write.getCall(0).args[0].should.equal('[');
          testRes.write.getCall(1).args[0].should.equal('[{"id":"a","ok":true},{"id":"b","error":true}],');
          testRes.write.getCall(2).args[0].should.equal('[{"id":"c","ok":true}]');
          testRes.write.getCall(3).args[0].should.equal(']');
          testRes.end.callCount.should.equal(1);
        });
    });

    it('retries update failures up to 3 times', function () {
      const generateParentDoc = () => ({ _id: 'parent', _rev: '1', contact: { _id: 'a' } });
      const docA = { _id: 'a', _rev: '1', type: 'person', parent: { _id: 'parent' } };
      const parent = generateParentDoc();
      const docB = { _id: 'b', _rev: '1' };
      const docC = { _id: 'c', _rev: '1' };
      const expectedA = Object.assign({}, docA, { _deleted: true });
      const expectedParent = Object.assign({}, parent, { contact: null });
      const expectedB = Object.assign({}, docB, { _deleted: true });
      const expectedC = Object.assign({}, docC, { _deleted: true });

      const allDocs = sinon.stub(db.medic, 'allDocs');
      allDocs.onCall(0).resolves({ rows: [{ doc: docA }, { doc: docB }] });
      allDocs.onCall(1).resolves({ rows: [{ doc: docA }] });
      allDocs.onCall(2).resolves({ rows: [{ doc: docC }] });

      const bulkDocs = sinon.stub(db.medic, 'bulkDocs');
      bulkDocs.onCall(0).resolves([{ id: docA._id, error: true }, { id: docB._id, ok: true }, { id: parent._id, error: true }]);
      bulkDocs.onCall(1).resolves([{ id: docA._id, ok: true }, { id: parent._id, error: true }]);
      bulkDocs.onCall(2).resolves([{ id: parent._id, error: true }]);
      bulkDocs.onCall(3).resolves([{ id: parent._id, error: true }]);
      bulkDocs.onCall(4).resolves([{ id: docC._id, ok: true }]);

      const get = sinon.stub(db.medic, 'get');
      get.onCall(0).resolves(generateParentDoc());
      get.onCall(1).resolves(generateParentDoc());
      get.onCall(2).resolves(generateParentDoc());
      get.onCall(3).resolves(generateParentDoc());

      return service.bulkDelete(testDocs, testRes, { batchSize: 2 })
        .then(() => {
          allDocs.callCount.should.equal(3);
          bulkDocs.callCount.should.equal(5);
          bulkDocs.getCall(0).args[0].should.deep.equal([expectedA, expectedB, expectedParent]);
          bulkDocs.getCall(1).args[0].should.deep.equal([expectedA, expectedParent]);
          bulkDocs.getCall(2).args[0].should.deep.equal([expectedParent]);
          bulkDocs.getCall(3).args[0].should.deep.equal([expectedParent]);
          bulkDocs.getCall(4).args[0].should.deep.equal([expectedC]);
          testRes.write.callCount.should.equal(4);
          testRes.write.getCall(0).args[0].should.equal('[');
          testRes.write.getCall(1).args[0].should.equal('[{"id":"b","ok":true},{"id":"a","ok":true},{"id":"parent","error":true}],');
          testRes.write.getCall(2).args[0].should.equal('[{"id":"c","ok":true}]');
          testRes.write.getCall(3).args[0].should.equal(']');
          testRes.end.callCount.should.equal(1);
        });
    });
  });

  describe('filterAllowedDocs', () => {
    beforeEach(() => {
      sinon.stub(db.medic, 'allDocs').resolves({ rows: [] });
      sinon.stub(db.medic, 'bulkDocs').resolves([]);
    });

    it('calls authorization.filterAllowedDocs with correct parameters, returns filtered list of docs', () => {
      const docs = [{ _id: 1 }, { _id: 2 }, { _id: 3 }, { _id: 4 }, { _id: 5 }],
            authzContext = { userCtx: {} };
      authorization.alwaysAllowCreate.withArgs({ _id: 2}).returns(true);
      authorization.alwaysAllowCreate.withArgs({ _id: 4}).returns(true);
      authorization.filterAllowedDocs.returns([
        { doc: { _id: 1 }, viewResults: { view: { _id: 1 } }, allowed: false, id: 1 },
        { doc: { _id: 2 }, viewResults: { view: { _id: 2 } }, allowed: true, id: 2 },
        { doc: { _id: 4 }, viewResults: { view: { _id: 4 } }, allowed: true, id: 4 },
      ]);

      const result = service._filterAllowedDocs(authzContext, docs);

      authorization.filterAllowedDocs.callCount.should.equal(1);
      authorization.filterAllowedDocs.args[0].should.deep.equal([
        authzContext,
        [
          { doc: { _id: 1 }, viewResults: { view: { _id: 1 } }, allowed: false, id: 1 },
          { doc: { _id: 2 }, viewResults: { view: { _id: 2 } }, allowed: true, id: 2 },
          { doc: { _id: 3 }, viewResults: { view: { _id: 3 } }, allowed: false, id: 3 },
          { doc: { _id: 4 }, viewResults: { view: { _id: 4 } }, allowed: true, id: 4 },
          { doc: { _id: 5 }, viewResults: { view: { _id: 5 } }, allowed: false, id: 5 }
        ]
      ]);

      result.length.should.equal(3);
      result.should.deep.equal([{ _id: 1 }, { _id: 2 }, { _id: 4 }]);
    });
  });

  describe('filterNewDocs', () => {
    beforeEach(() => {
      sinon.stub(db.medic, 'allDocs').resolves({ rows: [] });
      sinon.stub(db.medic, 'bulkDocs').resolves([]);
    });

    it('returns identical array when all docs are new', () => {
      const docs = [
        { someData: 'aaa' },
        { otherData: 'bbb' },
      ];
      return service._filterNewDocs([], docs).then(result => {
          result.length.should.equal(2);
          result.should.deep.equal(docs);
        });
    });

    it('returns empty array when all docs are allowed', () => {
      const docs = [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }, { _id: 'd' }, { _id: 'e' }];
      const allowedDocIds = ['a', 'b', 'c', 'd', 'e'];
      return service._filterNewDocs(allowedDocIds, docs).then(result => {
        result.length.should.equal(0);
      });
    });

    it('returns not found docs', () => {
      const docs = [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }, { _id: 'd' }, { _id: 'e' }];
      const dbDocs = [{ id: 'a' }, { id: 'b' }, { key: 'c' }, { key: 'd' }, { id: 'e' }];

      db.medic.allDocs.resolves({ rows: dbDocs });

      return service._filterNewDocs([], docs).then(result => {
          db.medic.allDocs.callCount.should.equal(1);
          db.medic.allDocs.args[0][0].keys.should.deep.equal([ 'a', 'b', 'c', 'd', 'e' ]);
          result.length.should.equal(2);
          result[0].should.deep.equal({ _id: 'c' });
          result[1].should.deep.equal({ _id: 'd' });
        });
    });

    it('excludes known allowed ids from allDocs query', () => {
      const docs = [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }, { _id: 'd' }, { _id: 'e' }];
      const allowedDocIds = ['b', 'c'];
      db.medic.allDocs.resolves({ rows: docs });

      return service._filterNewDocs(allowedDocIds, docs).then(() => {
          db.medic.allDocs.callCount.should.equal(1);
          db.medic.allDocs.args[0][0].keys.should.deep.equal([ 'a', 'd', 'e' ]);
        });
    });
  });

  describe('Filter Request Docs', () => {
    beforeEach(() => {
      sinon.stub(db.medic, 'allDocs').resolves({ rows: [] });
      sinon.stub(db.medic, 'bulkDocs').resolves([]);
    });

    it('returns empty when request docs is empty', () => {
      return service._filterRequestDocs({}, []).then(result => {
        result.length.should.equal(0);
      });
    });

    it('filters allowed docs by their posted content', () => {
      const docs = [{ _id: 1 }, { _id: 2 }, { _id: 3 }, { _id: 4 }, { _id: 5 }];
      const allowedDocIds = [1, 2, 3, 4, 5];

      authorization.filterAllowedDocs.returns([
        { id: 1, doc: { _id: 1 }, viewResults: { view: { _id: 1 }}, allowed: false },
        { id: 5, doc: { _id: 5 }, viewResults: { view: { _id: 5 }}, allowed: false },
        { id: 3, doc: { _id: 3 }, viewResults: { view: { _id: 3 }}, allowed: false },
      ]);

      return service._filterRequestDocs({ allowedDocIds }, docs).then(result => {
        result.length.should.equal(3);
        result.should.deep.equal([{ _id: 1 }, { _id: 5 }, { _id: 3 }]);
        authorization.filterAllowedDocs.callCount.should.equal(1);
        authorization.filterAllowedDocs.args[0][1].should.deep.equal([
          { id: 1, doc: { _id: 1 }, viewResults: { view: { _id: 1 }}, allowed: false },
          { id: 2, doc: { _id: 2 }, viewResults: { view: { _id: 2 }}, allowed: false },
          { id: 3, doc: { _id: 3 }, viewResults: { view: { _id: 3 }}, allowed: false },
          { id: 4, doc: { _id: 4 }, viewResults: { view: { _id: 4 }}, allowed: false },
          { id: 5, doc: { _id: 5 }, viewResults: { view: { _id: 5 }}, allowed: false },
        ]);
      });
    });

    it('returns filtered list when none of the docs are new', () => {
      const docs = [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }, { _id: 'd' }, { _id: 'e' }];
      const allowedDocIds = ['a', 'c', 'e'];
      authorization.filterAllowedDocs.callsFake((ctx, docs) => docs);
      db.medic.allDocs.resolves({rows: [{ id: 'b' }, { id: 'd' }]});

      return service._filterRequestDocs({ userCtx, allowedDocIds }, docs).then(result => {
        authorization.getViewResults.callCount.should.equal(5);
        authorization.filterAllowedDocs.callCount.should.equal(1);
        authorization.filterAllowedDocs.args[0][1].should.deep.equal([
          { id: 'a', doc: { _id: 'a' }, viewResults: { view: { _id: 'a' } }, allowed: false },
          { id: 'b', doc: { _id: 'b' }, viewResults: { view: { _id: 'b' } }, allowed: false },
          { id: 'c', doc: { _id: 'c' }, viewResults: { view: { _id: 'c' } }, allowed: false },
          { id: 'd', doc: { _id: 'd' }, viewResults: { view: { _id: 'd' } }, allowed: false },
          { id: 'e', doc: { _id: 'e' }, viewResults: { view: { _id: 'e' } }, allowed: false }
        ]);

        db.medic.allDocs.callCount.should.equal(1);
        db.medic.allDocs.args[0][0].should.deep.equal({ keys: ['b', 'd'] });

        result.length.should.equal(3);
        result.should.deep.equal([{ _id: 'a' }, { _id: 'c' }, { _id: 'e' }]);
      });
    });

    it('returns filtered list along with allowed new docs', () => {
      const docs = [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }, { _id: 'd' }, { _id: 'e' }, { _id: 'f' }, { key: 'g' }];
      const allowedDocIds = ['a', 'c'];

      authorization.getViewResults.withArgs({ key: 'g' }).returns({ view1: 'g' });
      authorization.filterAllowedDocs.returns([
        { id: 'a', doc: { _id: 'a' }, viewResults: { view: { _id: 'a' } }, allowed: false },
        { id: 'b', doc: { _id: 'b' }, viewResults: { view: { _id: 'b' } }, allowed: false },
        { id: 'd', doc: { _id: 'd' }, viewResults: { view: { _id: 'd' } }, allowed: false },
        { id: undefined, doc: { key: 'g' }, viewResults: { view1: 'g' }, allowed: false }
      ]);

      db.medic.allDocs
        .withArgs({ keys: ['b', 'd'] })
        .resolves({ rows: [{ id: 'b' }, { key: 'd' }]});

      return service._filterRequestDocs({ userCtx, allowedDocIds }, docs).then(result => {
        authorization.getViewResults.callCount.should.equal(7);

        result.should.deep.equal([{ _id: 'a' }, { _id: 'd' }, { key: 'g' }]);
        authorization.filterAllowedDocs.callCount.should.equal(1);
        authorization.filterAllowedDocs.args[0][1].should.deep.equal([
          { id: 'a', doc: { _id: 'a' }, viewResults: { view: { _id: 'a' } }, allowed: false },
          { id: 'b', doc: { _id: 'b' }, viewResults: { view: { _id: 'b' } }, allowed: false },
          { id: 'c', doc: { _id: 'c' }, viewResults: { view: { _id: 'c' } }, allowed: false },
          { id: 'd', doc: { _id: 'd' }, viewResults: { view: { _id: 'd' } }, allowed: false },
          { id: 'e', doc: { _id: 'e' }, viewResults: { view: { _id: 'e' } }, allowed: false },
          { id: 'f', doc: { _id: 'f' }, viewResults: { view: { _id: 'f' } }, allowed: false },
          { id: undefined, doc: { key: 'g' }, viewResults: { view1: 'g' }, allowed: false }
        ]);
      });
    });
  });

  describe('Format results', () => {
    it('passes unchanged response if `new_edits` param is false', () => {
      service.formatResults(false, [], [], ['my response']).should.deep.equal(['my response']);
    });

    it('passes unchanged response for malformed responses', () => {
      const requestDocs = [{ _id: 1 }, { _id: 2 }];
      service.formatResults(undefined, requestDocs, [], { name: 'eddie' }).should.deep.equal({ name: 'eddie' });
    });

    it('fills for forbidden docs with stubs and preserves correct order', () => {
      const requestDocs = [{ _id: 1 }, { _id: 2 }, { _id: 3 }, { something: 4 }, { _id: 5 }],
            filteredDocs = [{ _id: 5 }, { _id: 2 }],
            response = [{ id: 5, ok: true }, { id: 2, ok: true }];

      service.formatResults(undefined, requestDocs, filteredDocs, response).should.deep.equal([
        { id: 1, error: 'forbidden' },
        { id: 2, ok: true },
        { id: 3, error: 'forbidden' },
        { id: undefined, error: 'forbidden' },
        { id: 5, ok: true }
      ]);
    });
  });

  describe('Filter Offline Request', () => {
    let docs;

    beforeEach(() => {
      sinon.stub(db.medic, 'allDocs').resolves({ rows: [] });
      sinon.stub(db.medic, 'bulkDocs').resolves([]);
      userCtx = { name: 'user' };
      docs = [ { _id: 'a' }, { _id: 'b' }, { _id: 'c' }, { _id: 'd' }, { _id: 'e' } ];
    });

    it('calls authorization.getAllowedIds and authorization.getAuthorizationData with correct parameters', () => {
      authorization.getAuthorizationContext.resolves({ subjectIds: ['a'],  userCtx: { name: 'user' } });
      authorization.getAllowedDocIds.resolves(['a', 'b']);

      return service
        .filterOfflineRequest(userCtx, docs)
        .then(() => {
          authorization.getAuthorizationContext.callCount.should.equal(1);
          authorization.getAuthorizationContext.args[0][0].should.equal(userCtx);

          authorization.getAllowedDocIds.callCount.should.equal(1);
          authorization.getAllowedDocIds.args[0][0].should.deep.equal(
            { userCtx: { name: 'user' }, subjectIds: ['a'], allowedDocIds: ['a', 'b']});
      });
    });

    it('throws authorization.getAuthorizationData errors', () => {
      authorization.getAuthorizationContext.rejects(new Error('something'));

      return service
        .filterOfflineRequest(userCtx, docs)
        .catch(err => {
          err.message.should.equal('something');
      });
    });

    it('throws authorization.getAllowedIds errors', () => {
      authorization.getAllowedDocIds.rejects(new Error('something'));

      return service
        .filterOfflineRequest(userCtx, docs)
        .catch(err => {
          err.message.should.equal('something');
        });
    });

    it('replaces request body with filtered docs', () => {
      authorization.getAllowedDocIds.resolves(['a', 'b']);
      authorization.filterAllowedDocs.returns([{ doc: { _id: 'a'} }, { doc: { _id: 'b' } }]);
      db.medic.allDocs.resolves({ rows: [{ id: 'c' }, { id: 'd' }, { id: 'e' }] });

      return service
        .filterOfflineRequest(userCtx, docs)
        .then(result => {
          result.should.deep.equal([{ _id: 'a'}, { _id: 'b' }]);
      });
    });

    it('converts allowed tombstone ids', () => {
      authorization.getAllowedDocIds.resolves(['a', 'tombstone-c', 'tombstone-e']);
      authorization.filterAllowedDocs.returns([ { doc: { _id: 'a' } }, { doc: { _id: 'c' } }, { doc: { _id: 'e' } } ]);
      authorization.convertTombstoneIds.withArgs(['a', 'tombstone-c', 'tombstone-e']).returns(['a', 'c', 'e']);

      db.medic.allDocs
        .withArgs({ keys: ['b', 'd'] })
        .resolves({ rows: [{ id: 'd' }, { id: 'b' }] });

      return service
        .filterOfflineRequest(userCtx, docs)
        .then(result => {
          result.should.deep.equal([
            { _id: 'a' },
            { _id: 'c' },
            { _id: 'e' },
          ]);
      });
    });

    it('filters request', () => {
      docs = [
        { _id: 'a'}, { _id: 'b' }, { _id: 'c' }, { _id: 'f' }, { _id: 'g' },
        { _id: 'h' }, { name: 'a' }, { name: 'b' }, { _id: 'deleted' },
        { _id: 'fb1' }, { _id: 'fb2' }
      ];

      authorization.getAllowedDocIds.resolves(['a', 'c', 'd', 'e', 'deleted-tombstone']);
      authorization.filterAllowedDocs.returns([
        { doc :{ _id: 'b' }}, { doc :{ _id: 'c' }}, { doc: { _id: 'g' }},  { doc: { name: 'a' }},
        { doc: { _id: 'deleted' }}, { doc: { _id: 'fb1' }}, { doc: { _id: 'fb2' }}
      ]);

      authorization.alwaysAllowCreate
        .withArgs({ _id: 'fb1'}).returns(true)
        .withArgs({ _id: 'fb2'}).returns(true);

      authorization.convertTombstoneIds
        .withArgs(['a', 'c', 'd', 'e', 'deleted-tombstone']).returns(['a', 'c', 'd', 'e', 'deleted']);

      db.medic.allDocs
        .withArgs({ keys: [ 'b', 'g', 'fb1', 'fb2'] })
        .resolves({ rows: [{ id: 'b' }, { id: 'fb2' }]});

      return service
        .filterOfflineRequest(userCtx, docs)
        .then(result => {
          result.should.deep.equal([
            { _id: 'c' },
            { _id: 'deleted' },
            { _id: 'g' },
            { name: 'a'},
            { _id: 'fb1'}
          ]);
      });
    });
  });
});
