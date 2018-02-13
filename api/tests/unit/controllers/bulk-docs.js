const controller = require('../../../controllers/bulk-docs'),
      db = require('../../../db'),
      sinon = require('sinon').sandbox.create();

exports.setUp = callback => {
  callback();
};

exports.tearDown = callback => {
  sinon.restore();
  callback();
};

const testReq = {
  body: {
    docs: [
      { _id: 'a' },
      { _id: 'b' },
      { _id: 'c' }
    ]
  }
};

exports['bulkDelete returns errors from db fetch'] = test => {
  test.expect(2);
  const fetchDocs = sinon.stub(db.medic, 'fetch').callsArgWith(1, 'oh no');
  controller.bulkDelete(testReq, {}, err => {
    test.equals(err, 'oh no');
    test.equals(fetchDocs.callCount, 1);
    test.done();
  });
};

exports['bulkDelete calls db fetch with correct args'] = test => {
  test.expect(2);
  const fetchDocs = sinon.stub(db.medic, 'fetch').callsArgWith(1, 'oh no');
  controller.bulkDelete(testReq, {}, () => {
    test.equals(fetchDocs.callCount, 1);
    test.deepEqual(fetchDocs.firstCall.args[0], { keys: ['a', 'b', 'c'] });
    test.done();
  });
};

exports['bulkDelete writes chunked response'] = test => {
  test.expect(10);

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
  controller.bulkDelete(testReq, testRes, () => {
    test.equals(fetchDocs.callCount, 1);
    test.equals(bulk.callCount, 2);
    test.deepEqual(bulk.firstCall.args[0], { docs: [docA, docB] });
    test.deepEqual(bulk.secondCall.args[0], { docs: [docC] });
    test.equals(testRes.write.callCount, 4);
    test.equals(testRes.write.getCall(0).args[0], '[');
    test.equals(testRes.write.getCall(1).args[0], '[{"ok":true},{"ok":true}],');
    test.equals(testRes.write.getCall(2).args[0], '[{"ok":true}]');
    test.equals(testRes.write.getCall(3).args[0], ']');
    test.equals(testRes.end.callCount, 1);
    test.done();
  }, { batchSize: 2 });
};
