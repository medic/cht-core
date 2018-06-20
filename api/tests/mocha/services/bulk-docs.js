const service = require('../../../src/services/bulk-docs');
const db = require('../../../src/db-pouch');
const sinon = require('sinon').sandbox.create();
require('chai').should();

const authorization = require('../../../src/services/authorization'),
      serverUtils = require('../../../src/server-utils');

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

    sinon.stub(authorization, 'getUserAuthorizationData').resolves({});
    sinon.stub(authorization, 'getAllowedDocIds').resolves([]);
    sinon.stub(authorization, 'excludeTombstoneIds').callsFake(list => list);
    sinon.stub(authorization, 'convertTombstoneIds').callsFake(list => list);
    sinon.stub(authorization, 'allowedDoc').returns(true);
    sinon.stub(authorization, 'getViewResults').callsFake(doc => ({ view: doc }));
    sinon.stub(authorization, 'alwaysAllowCreate').returns(false);
    sinon.stub(serverUtils, 'serverError');
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

    it('filters authorized docs, requests view results for each doc', () => {
      const docs = [{ _id: 1 }, { _id: 2 }, { _id: 3 }, { _id: 4 }, { _id: 5 }];

      authorization.allowedDoc.withArgs(1).returns({ newSubjects: 0 });
      authorization.allowedDoc.withArgs(2).returns({ newSubjects: 0 });
      authorization.allowedDoc.withArgs(3).returns(false);
      authorization.allowedDoc.withArgs(4).returns(false);
      authorization.allowedDoc.withArgs(5).returns(true);

      const result = service._filterAllowedDocs({ userCtx }, docs);
      result.should.deep.equal([{ _id: 1 }, { _id: 2 }, { _id: 5 }]);
      authorization.getViewResults.callCount.should.equal(5);
      authorization.allowedDoc.args.should.deep.equal([
        [1, { userCtx }, { view: { _id: 1 }}],
        [2, { userCtx }, { view: { _id: 2 }}],
        [3, { userCtx }, { view: { _id: 3 }}],
        [4, { userCtx }, { view: { _id: 4 }}],
        [5, { userCtx }, { view: { _id: 5 }}],
      ]);
    });

    it('reiterates over pending docs every time an allowed doc increases the subjects list', () => {
      const docs = [{ _id: 6 }, { _id: 7 }, { _id: 8 }, { _id: 4 }, { _id: 5 }, { _id: 2 }, { _id: 3 }, { _id: 1 }];

      authorization.allowedDoc.withArgs(1).returns({ newSubjects: 2 });
      authorization.allowedDoc.withArgs(2)
        .onCall(0).returns(false)
        .onCall(1).returns({ newSubjects: 2 });

      authorization.allowedDoc.withArgs(3).returns(false);
      authorization.allowedDoc.withArgs(4)
        .onCall(0).returns(false)
        .onCall(1).returns(false)
        .onCall(2).returns({ newSubjects: 0 });
      authorization.allowedDoc.withArgs(5).returns(false);
      authorization.allowedDoc.withArgs(6).returns(false);
      authorization.allowedDoc.withArgs(7).returns(false);
      authorization.allowedDoc.withArgs(8).returns(false);

      const result = service._filterAllowedDocs({ userCtx }, docs);

      authorization.allowedDoc.withArgs(1).callCount.should.equal(1);
      authorization.allowedDoc.withArgs(2).callCount.should.equal(2);
      authorization.allowedDoc.withArgs(3).callCount.should.equal(3);
      authorization.allowedDoc.withArgs(4).callCount.should.equal(3);
      authorization.allowedDoc.withArgs(5).callCount.should.equal(3);
      authorization.allowedDoc.withArgs(6).callCount.should.equal(3);
      authorization.allowedDoc.withArgs(7).callCount.should.equal(3);
      authorization.allowedDoc.withArgs(8).callCount.should.equal(3);
      authorization.allowedDoc.callCount.should.equal(21);

      result.length.should.equal(3);
      result.should.deep.equal([{ _id: 1 }, { _id: 2 }, { _id: 4 }]);

      authorization.getViewResults.callCount.should.equal(8);
    });

    it('does not reiterate when allowed docs do not modify the subjects list', () => {
      const docs = [{ _id: 4 }, { _id: 5 }, { _id: 2 }, { _id: 3 }, { _id: 1 }];

      authorization.allowedDoc.withArgs(1).returns({ newSubjects: 0 });
      authorization.allowedDoc.withArgs(2).returns(false);
      authorization.allowedDoc.withArgs(3).returns({ newSubjects: 0 });
      authorization.allowedDoc.withArgs(4).returns({ newSubjects: 0 });
      authorization.allowedDoc.withArgs(5).returns(false);

      const result = service._filterAllowedDocs({ userCtx }, docs);

      result.length.should.equal(3);
      result.should.deep.equal([{ _id: 4 }, { _id: 3 }, { _id: 1 }]);
      authorization.allowedDoc.callCount.should.equal(5);
    });

    it('returns docs which are always allowed to be created', () => {
      const docs = [{ _id: 4 }, { _id: 5 }, { _id: 2 }, { _id: 3 }, { _id: 1 }];
      authorization.allowedDoc.returns(false);
      authorization.alwaysAllowCreate.withArgs({ _id: 4 }).returns(true);
      authorization.alwaysAllowCreate.withArgs({ _id: 2 }).returns(true);

      const result = service._filterAllowedDocs({ userCtx }, docs);

      result.length.should.equal(2);
      result.should.deep.equal([{ _id: 4 }, { _id: 2 }]);
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
      authorization.allowedDoc
        .withArgs(1).returns(true)
        .withArgs(2).returns(false)
        .withArgs(3).returns(true)
        .withArgs(4).returns(false)
        .withArgs(5).returns(true);

      return service._filterRequestDocs({ allowedDocIds }, docs).then(result => {
        result.length.should.equal(3);
        result.should.deep.equal([{ _id: 1 }, { _id: 3 }, { _id: 5 }]);
      });
    });

    it('returns filtered list when none of the docs are new', () => {
      const docs = [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }, { _id: 'd' }, { _id: 'e' }];
      const allowedDocIds = ['a', 'c', 'e'];
      authorization.allowedDoc.returns(true);
      db.medic.allDocs.resolves({rows: [{ id: 'b' }, { id: 'd' }]});

      return service._filterRequestDocs({ userCtx, allowedDocIds }, docs).then(result => {
        authorization.getViewResults.callCount.should.equal(5);
        authorization.allowedDoc.callCount.should.equal(5);

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
      authorization.allowedDoc
        .withArgs('a').returns(true)
        .withArgs('b').returns(true)
        .withArgs('c').returns(false)
        .withArgs('d').returns(true)
        .withArgs('e').returns(false)
        .withArgs('f').returns(false)
        .withArgs(sinon.match.any, sinon.match.any, { view1: 'g' }).returns(true);

      db.medic.allDocs
        .withArgs({ keys: ['b', 'd'] })
        .resolves({ rows: [{ id: 'b' }, { key: 'd' }]});

      return service._filterRequestDocs({ userCtx, allowedDocIds }, docs).then(result => {
        authorization.allowedDoc.callCount.should.equal(7);
        authorization.getViewResults.callCount.should.equal(7);

        result.should.deep.equal([{ _id: 'a' }, { _id: 'd' }, { key: 'g' }]);
      });
    });
  });

  describe('Intercept Response', () => {
    let testReq,
        testRes;

    beforeEach(() => {
      testReq = { body: {} };
      testRes = {
        write: sinon.stub(),
        end: sinon.stub()
      };
    });

    it('passes unchanged response if `new_edits` param is false', () => {
      testReq.body.new_edits = false;

      service._interceptResponse(testReq, testRes, JSON.stringify(['my response']));
      testRes.write.callCount.should.equal(1);
      testRes.write.args[0][0].should.equal(JSON.stringify(['my response']));
      testRes.end.callCount.should.equal(1);
    });

    it('passes unchanged response for malformed responses', () => {
      testReq.originalBody = { docs: [{ _id: 1 }, { _id: 2 }] };
      service._interceptResponse(testReq, testRes, JSON.stringify({ name: 'eddie' }));
      testRes.write.callCount.should.equal(1);
      testRes.write.args[0][0].should.equal(JSON.stringify({ name: 'eddie' }));
      testRes.end.callCount.should.equal(1);
    });

    it('fills for restricted docs with stubs and preserves correct order', () => {
      testReq.originalBody = { docs: [{ _id: 1 }, { _id: 2 }, { _id: 3 }, { _id: 4 }, { _id: 5 }] };
      testReq.body = { docs: [{ _id: 5 }, { _id: 2 }] };
      service._interceptResponse(testReq, testRes, JSON.stringify([{ id: 5, ok: true }, { id: 2, ok: true }]));

      testRes.write.callCount.should.equal(1);
      testRes.write.args[0][0].should.equal(JSON.stringify([
        { id: 1, error: 'forbidden' },
        { id: 2, ok: true },
        { id: 3, error: 'forbidden' },
        { id: 4, error: 'forbidden' },
        { id: 5, ok: true }
      ]));
      testRes.end.callCount.should.equal(1);
    });
  });

  describe('invalidRequest', () => {
    it('returns error when body is not set', () => {
      service._invalidRequest(false).should.deep.equal({ error: 'bad_request', reason: 'invalid UTF-8 JSON' });
    });

    it('returns error when body is missing `docs` property', () => {
      service._invalidRequest({ body: {} }).should.deep.equal(
        { error: 'bad_request', reason: 'POST body must include `docs` parameter.' });
    });

    it('returns error when `docs` is not an array', () => {
      service._invalidRequest({ body: { docs: 'alpha' } }).should.deep.equal(
        { error: 'bad_request', reason: '`docs` parameter must be an array.' });
    });
  });

  describe('Filter Offline Request', () => {
    let testReq;

    beforeEach(() => {
      sinon.stub(db.medic, 'allDocs').resolves({ rows: [] });
      sinon.stub(db.medic, 'bulkDocs').resolves([]);
      testReq = {
        userCtx: { name: 'user' },
        body:
          {
            docs: [
              { _id: 'a' },
              { _id: 'b' },
              { _id: 'c' },
              { _id: 'd' },
              { _id: 'e' }
            ]
          }
      };
    });

    it('calls authorization.getAllowedIds and authorization.getAuthorizationData with correct parameters', () => {
      authorization.getUserAuthorizationData.resolves({ subjectIds: ['a'] });
      authorization.getAllowedDocIds.resolves(['a', 'b']);

      return service.filterOfflineRequest(testReq, testRes, next).then(() => {
        authorization.getUserAuthorizationData.callCount.should.equal(1);
        authorization.getUserAuthorizationData.args[0][0].should.equal(testReq.userCtx);

        authorization.getAllowedDocIds.callCount.should.equal(1);
        authorization.getAllowedDocIds.args[0][0].should.deep.equal(
          { userCtx: { name: 'user' }, subjectIds: ['a'], allowedDocIds: ['a', 'b']});
      });
    });

    it('catches authorization.getAuthorizationData errors', () => {
      authorization.getUserAuthorizationData.rejects({ error: 'something' });

      return service.filterOfflineRequest(testReq, testRes, next).then(() => {
        serverUtils.serverError.callCount.should.equal(1);
        serverUtils.serverError.args[0][0].should.deep.equal({ error: 'something' });
      });
    });

    it('catches authorization.getAllowedIds errors', () => {
      authorization.getAllowedDocIds.rejects({ error: 'something' });

      return service.filterOfflineRequest(testReq, testRes, next).then(() => {
        serverUtils.serverError.callCount.should.equal(1);
        serverUtils.serverError.args[0][0].should.deep.equal({ error: 'something' });
        next.callCount.should.equal(0);
      });
    });

    it('replaces request body with filtered docs', () => {
      authorization.getAllowedDocIds.resolves(['a', 'b']);
      db.medic.allDocs.resolves({ rows: [{ id: 'c' }, { id: 'd' }, { id: 'e' }] });

      return service.filterOfflineRequest(testReq, testRes, next).then(() => {
        next.callCount.should.equal(1);
        serverUtils.serverError.callCount.should.equal(0);
        testReq.body.docs.should.deep.equal([{ _id: 'a'}, { _id: 'b' }]);
      });
    });

    it('converts allowed tombstone ids', () => {
      authorization.getAllowedDocIds.resolves(['a', 'tombstone-c', 'tombstone-e']);
      authorization.convertTombstoneIds.withArgs(['a', 'tombstone-c', 'tombstone-e']).returns(['a', 'c', 'e']);

      db.medic.allDocs
        .withArgs({ keys: ['b', 'd'] })
        .resolves({ rows: [{ id: 'd' }, { id: 'b' }] });

      return service.filterOfflineRequest(testReq, testRes, next).then(() => {
        serverUtils.serverError.callCount.should.equal(0);
        next.callCount.should.equal(1);
        testReq.body.docs.should.deep.equal([
          { _id: 'a' },
          { _id: 'c' },
          { _id: 'e' },
        ]);
      });
    });

    it('filters request', () => {
      testReq.body = { docs: [
          { _id: 'a'}, { _id: 'b' }, { _id: 'c' }, { _id: 'f' }, { _id: 'g' },
          { _id: 'h' }, { name: 'a' }, { name: 'b' }, { _id: 'deleted' },
          { _id: 'fb1' }, { _id: 'fb2' }
        ]
      };

      authorization.getAllowedDocIds.resolves(['a', 'c', 'd', 'e', 'deleted-tombstone']);
      authorization.allowedDoc
        .withArgs('a').returns(false)
        .withArgs('b').returns(true)
        .withArgs('c').returns(true)
        .withArgs('f').returns(false)
        .withArgs('g').returns(true)
        .withArgs('h').returns(false)
        .withArgs(sinon.match.any, sinon.match.any, { view: { name: 'a' } }).returns(true)
        .withArgs(sinon.match.any, sinon.match.any, { view: { name: 'b' } }).returns(false)
        .withArgs('deleted').returns(true)
        .withArgs('fb1').returns(false)
        .withArgs('fb2').returns(false);

      authorization.alwaysAllowCreate
        .withArgs({ _id: 'fb1'}).returns(true)
        .withArgs({ _id: 'fb2'}).returns(true);

      authorization.convertTombstoneIds
        .withArgs(['a', 'c', 'd', 'e', 'deleted-tombstone']).returns(['a', 'c', 'd', 'e', 'deleted']);

      db.medic.allDocs
        .withArgs({ keys: [ 'b', 'g', 'fb1', 'fb2'] })
        .resolves({ rows: [{ id: 'b' }, { id: 'fb2' }]});

      return service.filterOfflineRequest(testReq, testRes, next).then(() => {
        serverUtils.serverError.callCount.should.equal(0);
        next.callCount.should.equal(1);
        testRes.write.callCount.should.equal(0);
        testReq.body.docs.should.deep.equal([
          { _id: 'c' },
          { _id: 'deleted' },
          { _id: 'g' },
          { name: 'a'},
          { _id: 'fb1'}
        ]);
        testRes.interceptResponse.should.be.a('function');
        testReq.originalBody.should.deep.equal({ docs: [
            { _id: 'a'}, { _id: 'b' }, { _id: 'c' }, { _id: 'f' }, { _id: 'g' },
            { _id: 'h' }, { name: 'a' }, { name: 'b' }, { _id: 'deleted' },
            { _id: 'fb1' }, { _id: 'fb2' }
          ]
        });

        const response = [
          { id: 'c', ok: true },
          { id: 'deleted', ok: true },
          { id: 'g', ok: true },
          { id: 'new_id', ok: true },
          { id: 'fb1', ok: true }
        ];

        testRes.interceptResponse(JSON.stringify(response));

        testRes.write.callCount.should.equal(1);
        testRes.end.callCount.should.equal(1);

        testRes.write.args[0][0].should.equal(JSON.stringify([
          { id: 'a', error: 'forbidden'},
          { id: 'b', error: 'forbidden' },
          { id: 'c', ok: true },
          { id: 'f', error: 'forbidden' },
          { id: 'g', ok: true },
          { id: 'h', error: 'forbidden' },
          { id: 'new_id', ok: true },
          { id: undefined, error: 'forbidden' },
          { id: 'deleted', ok: true },
          { id: 'fb1', ok: true },
          { id: 'fb2', error: 'forbidden' }
        ]));
      });
    });

    it('handles requests without a body', () => {
      testReq.body = null;

      return Promise
        .all([
          service.filterOfflineRequest(testReq, testRes),
          Promise.resolve()
        ]).then(() => {
          testRes.type.callCount.should.equal(1);
          testRes.type.args[0][0].should.equal('json');
          authorization.getUserAuthorizationData.callCount.should.equal(0);
          testRes.write.callCount.should.equal(1);
          testRes.end.callCount.should.equal(1);
          JSON.parse(testRes.write.args[0][0]).error.should.equal('bad_request');
        });
    });

    it('handles requests without `docs` parameter', () => {
      testReq.body = { some: 'thing' };

      return Promise
        .all([
          service.filterOfflineRequest(testReq, testRes),
          Promise.resolve()
        ]).then(() => {
          authorization.getUserAuthorizationData.callCount.should.equal(0);
          testRes.write.callCount.should.equal(1);
          testRes.end.callCount.should.equal(1);
          JSON.parse(testRes.write.args[0][0]).error.should.equal('bad_request');
        });
    });

    it('handles requests when `docs` parameter is not an array', () => {
      testReq.body = { docs: 'something' };

      return Promise
        .all([
          service.filterOfflineRequest(testReq, testRes),
          Promise.resolve()
        ]).then(() => {
          authorization.getUserAuthorizationData.callCount.should.equal(0);
          testRes.write.callCount.should.equal(1);
          testRes.end.callCount.should.equal(1);
          JSON.parse(testRes.write.args[0][0]).error.should.equal('bad_request');
        });
    });
  });
});
