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
      const allDocs = sinon.stub().resolves({ rows: [] });
      db._setMedic({ allDocs: allDocs });
      return service.bulkDelete(testDocs, testRes)
        .then(() => {
          allDocs.callCount.should.equal(1);
          allDocs.firstCall.args[0].should.deep.equal({ keys: ['a', 'b', 'c'], include_docs: true });
        });
    });

    it('writes chunked response', function () {
      const docA = { _id: 'a', _rev: '1' };
      const docB = { _id: 'b', _rev: '1' };
      const docC = { _id: 'c', _rev: '1' };
      const allDocs = sinon.stub().resolves({
        rows: [{ doc: docA }, { doc: docB }, { doc: docC }]
      });

      const bulkDocs = sinon.stub();
      bulkDocs.onCall(0).resolves([{ ok: true }, { ok: true }]);
      bulkDocs.onCall(1).resolves([{ ok: true }]);

      db._setMedic({ allDocs: allDocs, bulkDocs: bulkDocs });

      return service.bulkDelete(testDocs, testRes, { batchSize: 2 })
        .then(() => {
          allDocs.callCount.should.equal(1);
          bulkDocs.callCount.should.equal(2);
          bulkDocs.firstCall.args[0].should.deep.equal([docA, docB]);
          bulkDocs.secondCall.args[0].should.deep.equal([docC]);
          testRes.write.callCount.should.equal(4);
          testRes.write.getCall(0).args[0].should.equal('[');
          testRes.write.getCall(1).args[0].should.equal('[{"ok":true},{"ok":true}],');
          testRes.write.getCall(2).args[0].should.equal('[{"ok":true}]');
          testRes.write.getCall(3).args[0].should.equal(']');
          testRes.end.callCount.should.equal(1);
        });
    });
  });
});
