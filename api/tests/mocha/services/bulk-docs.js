const service = require('../../../services/bulk-docs');
const db = require('../../../db-pouch');
const sinon = require('sinon').sandbox.create();
require('chai').should();

const testDocs = [
  { _id: 'a' },
  { _id: 'b' },
  { _id: 'c' }
];
let testRes;

describe('Bulk Docs Service', function () {
  beforeEach(function() {
    testRes = {
      write: sinon.stub(),
      end: sinon.stub(),
      type: () => {},
      setHeader: () => {}
    };
  });

  afterEach(function() {
    sinon.restore();
  });

  describe('Bulk Delete', function () {
    it('calls allDocs with correct args', function () {
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
      bulkDocs.onCall(0).resolves([{ id: docA._id, ok: true }, { id: docB._id, ok: true }]);
      bulkDocs.onCall(1).resolves([{ id: parent._id, ok: true }]);
      bulkDocs.onCall(2).resolves([{ id: docC._id, ok: true }]);

      sinon.stub(db.medic, 'get').resolves(parent);

      return service.bulkDelete(testDocs, testRes, { batchSize: 2 })
        .then(() => {
          allDocs.callCount.should.equal(2);
          allDocs.getCall(0).args[0].should.deep.equal({ keys: [docA._id, docB._id], include_docs: true });
          allDocs.getCall(1).args[0].should.deep.equal({ keys: [docC._id], include_docs: true });
          bulkDocs.callCount.should.equal(3);
          bulkDocs.getCall(0).args[0].should.deep.equal([expectedA, expectedB]);
          bulkDocs.getCall(1).args[0].should.deep.equal([expectedParent]);
          bulkDocs.getCall(2).args[0].should.deep.equal([expectedC]);
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
      allDocs.onCall(1).resolves({ rows: [{ doc: docC }, { doc: docA }] });
      allDocs.onCall(2).resolves({ rows: [{ doc: docB }] });
      allDocs.onCall(3).resolves({ rows: [{ doc: docB }] });
      allDocs.onCall(4).resolves({ rows: [{ doc: docB }] });

      const bulkDocs = sinon.stub(db.medic, 'bulkDocs');
      bulkDocs.onCall(0).resolves([{ id: docA._id, error: true }, { id: docB._id, error: true }]);
      bulkDocs.onCall(1).resolves([{ id: docC._id, ok: true }, { id: docA._id, ok: true }]);
      bulkDocs.onCall(2).resolves([{ id: docB._id, error: true }]);
      bulkDocs.onCall(3).resolves([{ id: docB._id, error: true }]);
      bulkDocs.onCall(4).resolves([{ id: docB._id, error: true }]);

      return service.bulkDelete(testDocs, testRes, { batchSize: 2 })
        .then(() => {
          allDocs.callCount.should.equal(5);
          allDocs.getCall(1).args[0].should.deep.equal({ keys: [docC._id, docA._id], include_docs: true });
          allDocs.getCall(2).args[0].should.deep.equal({ keys: [docB._id], include_docs: true });
          allDocs.getCall(3).args[0].should.deep.equal({ keys: [docB._id], include_docs: true });
          allDocs.getCall(4).args[0].should.deep.equal({ keys: [docB._id], include_docs: true });
          bulkDocs.callCount.should.equal(5);
          bulkDocs.getCall(1).args[0].should.deep.equal([expectedC, expectedA]);
          bulkDocs.getCall(2).args[0].should.deep.equal([expectedB]);
          bulkDocs.getCall(3).args[0].should.deep.equal([expectedB]);
          bulkDocs.getCall(4).args[0].should.deep.equal([expectedB]);
          testRes.write.callCount.should.equal(7);
          testRes.write.getCall(0).args[0].should.equal('[');
          testRes.write.getCall(1).args[0].should.equal('[],');
          testRes.write.getCall(2).args[0].should.equal('[{"id":"c","ok":true},{"id":"a","ok":true}],');
          testRes.write.getCall(3).args[0].should.equal('[],');
          testRes.write.getCall(4).args[0].should.equal('[],');
          testRes.write.getCall(5).args[0].should.equal('[{"id":"b","error":true}]');
          testRes.write.getCall(6).args[0].should.equal(']');
          testRes.end.callCount.should.equal(1);
        });
    });

    it('retries update failures up to 3 times', function () {
      const generateParentDoc = () => ({ _id: 'parent', _rev: '1', contact: { _id: 'a' } });
      const docA = { _id: 'a', _rev: '1', type: 'person', parent: { _id: 'parent' } };
      const parent = generateParentDoc();
      const docB = { _id: 'b', _rev: '1' };
      const docC = { _id: 'c', _rev: '1' };
      const expectedParent = Object.assign({}, parent, { contact: null });

      const allDocs = sinon.stub(db.medic, 'allDocs');
      allDocs.onCall(0).resolves({ rows: [{ doc: docA }, { doc: docB }] });
      allDocs.onCall(1).resolves({ rows: [{ doc: docC }] });

      const bulkDocs = sinon.stub(db.medic, 'bulkDocs');
      bulkDocs.onCall(0).resolves([{ id: docA._id, ok: true }, { id: docB._id, ok: true }]);
      bulkDocs.onCall(1).resolves([{ id: parent._id, error: true }]);
      bulkDocs.onCall(2).resolves([{ id: parent._id, error: true }]);
      bulkDocs.onCall(3).resolves([{ id: parent._id, error: true }]);
      bulkDocs.onCall(4).resolves([{ id: parent._id, error: true }]);
      bulkDocs.onCall(5).resolves([{ id: docC._id, ok: true }]);

      const get = sinon.stub(db.medic, 'get');
      get.onCall(0).resolves(generateParentDoc());
      get.onCall(1).resolves(generateParentDoc());
      get.onCall(2).resolves(generateParentDoc());
      get.onCall(3).resolves(generateParentDoc());

      return service.bulkDelete(testDocs, testRes, { batchSize: 2 })
        .then(() => {
          allDocs.callCount.should.equal(2);
          bulkDocs.callCount.should.equal(6);
          bulkDocs.getCall(1).args[0].should.deep.equal([expectedParent]);
          bulkDocs.getCall(2).args[0].should.deep.equal([expectedParent]);
          bulkDocs.getCall(3).args[0].should.deep.equal([expectedParent]);
          bulkDocs.getCall(4).args[0].should.deep.equal([expectedParent]);
          testRes.write.callCount.should.equal(4);
          testRes.write.getCall(0).args[0].should.equal('[');
          testRes.write.getCall(1).args[0].should.equal('[{"id":"a","ok":true},{"id":"b","ok":true},{"id":"parent","error":true}],');
          testRes.write.getCall(2).args[0].should.equal('[{"id":"c","ok":true}]');
          testRes.write.getCall(3).args[0].should.equal(']');
          testRes.end.callCount.should.equal(1);
        });
    });
  });
});
