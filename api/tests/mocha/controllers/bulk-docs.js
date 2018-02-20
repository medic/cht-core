const controller = require('../../../controllers/bulk-docs');
const db = require('../../../db');
const sinon = require('sinon').sandbox.create();
require('chai').should();

const testReq = {
  body: {
    docs: [
      { _id: 'a' },
      { _id: 'b' },
      { _id: 'c' }
    ]
  }
};

describe('Bulk Docs', function () {
  afterEach(function() {
    sinon.restore();
  });

  describe('Bulk Delete', function () {
    it('returns errors from db fetch', function () {
      const fetchDocs = sinon.stub(db.medic, 'fetch').callsArgWith(1, 'oh no');
      return controller.bulkDelete(testReq, {}, err => {
        err.should.equal('oh no');
        fetchDocs.callCount.should.equal(1);
      });
    });

    it('calls db fetch with correct args', function () {
      const fetchDocs = sinon.stub(db.medic, 'fetch').callsArgWith(1, 'oh no');
      return controller.bulkDelete(testReq, {}, () => {
        fetchDocs.callCount.should.equal(1);
        fetchDocs.firstCall.args[0].should.deep.equal({ keys: ['a', 'b', 'c'] });
      });
    });

    it('returns error from db bulk', function () {
      const docA = { _id: 'a', _rev: '1' };
      const fetchDocs = sinon.stub(db.medic, 'fetch').callsArgWith(1, null, { rows: [{ doc: docA }] });
      const bulk = sinon.stub(db.medic, 'bulk').callsArgWith(1, 'oh no');

      const testRes = {
        write: sinon.stub(),
        end: sinon.stub(),
        type: () => {},
        setHeader: () => {}
      };
      return controller.bulkDelete(testReq, testRes, err => {
        err.should.equal('oh no');
        fetchDocs.callCount.should.equal(1);
        bulk.callCount.should.equal(1);
        testRes.write.callCount.should.equal(1);
        testRes.end.callCount.should.equal(0);
      });
    });

    it('writes chunked response', function () {
      const docA = { _id: 'a', _rev: '1' };
      const docB = { _id: 'b', _rev: '1' };
      const docC = { _id: 'c', _rev: '1' };
      const fetchDocs = sinon.stub(db.medic, 'fetch').callsArgWith(1, null, {
        rows: [{ doc: docA }, { doc: docB }, { doc: docC }]
      });

      const bulk = sinon.stub(db.medic, 'bulk');
      bulk.onCall(0).callsArgWith(1, null, [{ ok: true }, { ok: true }]);
      bulk.onCall(1).callsArgWith(1, null, [{ ok: true }]);

      const testRes = {
        write: sinon.stub(),
        end: sinon.stub(),
        type: () => {},
        setHeader: () => {}
      };
      return controller.bulkDelete(testReq, testRes, () => {
        fetchDocs.callCount.should.equal(1);
        bulk.callCount.should.equal(2);
        bulk.firstCall.args[0].should.deep.equal({ docs: [docA, docB] });
        bulk.secondCall.args[0].should.deep.equal({ docs: [docC] });
        testRes.write.callCount.should.equal(4);
        testRes.write.getCall(0).args[0].should.equal('[');
        testRes.write.getCall(1).args[0].should.equal('[{"ok":true},{"ok":true}],');
        testRes.write.getCall(2).args[0].should.equal('[{"ok":true}]');
        testRes.write.getCall(3).args[0].should.equal(']');
        testRes.end.callCount.should.equal(1);
      }, { batchSize: 2 });
    });
  });
});
