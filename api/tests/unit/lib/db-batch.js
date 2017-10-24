const lib = require('../../../lib/db-batch'),
      db = require('../../../db'),
      sinon = require('sinon').sandbox.create(),
      ddocName = 'myddoc',
      viewName = 'myview',
      viewKey = 'mykey';

let iteratee;

exports.setUp = callback => {
  iteratee = sinon.stub();
  callback();
};

exports.tearDown = callback => {
  sinon.restore();
  callback();
};

exports['errors if the view errors'] = test => {
  sinon.stub(db.medic, 'view').callsArgWith(3, 'boom');
  lib.view(ddocName, viewName, { key: viewKey }, iteratee, err => {
    test.equals(err, 'boom');
    test.done();
  });
};

exports['errors if the iteratee errors'] = test => {
  sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: [ { doc: { _id: 'a' } } ] });
  iteratee.callsArgWith(1, 'boo');
  lib.view(ddocName, viewName, { key: viewKey }, iteratee, err => {
    test.equals(err, 'boo');
    test.done();
  });
};

exports['works with a single page'] = test => {
  const doc1 = { _id: 'a' };
  const doc2 = { _id: 'b' };
  const view = sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: [ { doc: doc1 }, { doc: doc2 } ] });
  iteratee.callsArgWith(1);
  lib.view(ddocName, viewName, { key: viewKey }, iteratee, err => {
    test.equals(err, null);
    test.equals(view.callCount, 1);
    test.equals(view.args[0][0], ddocName);
    test.equals(view.args[0][1], viewName);
    test.equals(view.args[0][2].key, viewKey);
    test.equals(view.args[0][2].include_docs, true);
    test.equals(view.args[0][2].limit, 101); // default limit is 100
    test.equals(iteratee.callCount, 1);
    test.deepEqual(iteratee.args[0][0], [ doc1, doc2 ]);
    test.done();
  });
};

exports['works with multiple pages'] = test => {
  const row1 = { key: viewKey, id: 'a', doc: { _id: 'a' } };
  const row2 = { key: viewKey, id: 'b', doc: { _id: 'b' } };
  const row3 = { key: viewKey, id: 'c', doc: { _id: 'c' } };
  const row4 = { key: viewKey, id: 'd', doc: { _id: 'd' } };
  const row5 = { key: viewKey, id: 'e', doc: { _id: 'e' } };
  const row6 = { key: viewKey, id: 'f', doc: { _id: 'f' } };
  const view = sinon.stub(db.medic, 'view');
  view.onCall(0).callsArgWith(3, null, { rows: [ row1, row2, row3 ] });
  view.onCall(1).callsArgWith(3, null, { rows: [ row3, row4, row5 ] });
  view.onCall(2).callsArgWith(3, null, { rows: [ row5, row6 ] });
  iteratee.callsArgWith(1);
  lib.view(ddocName, viewName, { key: viewKey, limit: 2 }, iteratee, err => {
    test.equals(err, null);
    test.equals(view.callCount, 3);
    test.equals(view.args[0][2].limit, 3); // given limit plus 1
    test.equals(view.args[0][2].startkey, undefined);
    test.equals(view.args[0][2].startkey_docid, undefined);
    test.equals(view.args[1][2].limit, 3);
    test.equals(view.args[1][2].startkey, viewKey);
    test.equals(view.args[1][2].startkey_docid, 'c');
    test.equals(view.args[2][2].limit, 3);
    test.equals(view.args[2][2].startkey, viewKey);
    test.equals(view.args[2][2].startkey_docid, 'e');
    test.equals(iteratee.callCount, 3);
    test.deepEqual(iteratee.args[0][0], [ row1.doc, row2.doc ]);
    test.deepEqual(iteratee.args[1][0], [ row3.doc, row4.doc ]);
    test.deepEqual(iteratee.args[2][0], [ row5.doc, row6.doc ]);
    test.done();
  });
};
