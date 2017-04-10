const sinon = require('sinon');

const transition = require('../../../transitions/maintain_info_document');

let db, audit;
exports.setUp = cb => {
  db = {
    medic: {
      get: sinon.stub(),
      insert: sinon.stub()
    }
  };
  audit = {
    get: sinon.stub()
  };

  cb();
};

exports['Does not create info documents for design documents'] = test => {
  test.equal(false, transition.filter({_id: '_design/blah'}));
  test.done();
};

exports['Does not try to create info documents for info documents'] = test => {
  test.equal(false, transition.filter({_id: 'foo', type: 'info'}));
  test.done();
};

exports['Updates an existing document with a new sync date'] = test => {
  const change = {id: 'foo'};

  const infoDoc = {
    _id: 'foo-info',
    type: 'info',
    doc_id: 'foo',
    initial_replication_date: new Date()
  };

  db.medic.get.callsArgWith(1, null, infoDoc);
  db.medic.insert.callsArg(1);

  transition.onMatch(change, db, audit, (err) => {
    test.ok(!err);
    test.ok(db.medic.get.calledWith(infoDoc._id));
    test.ok(infoDoc.latest_replication_date);
    test.ok(infoDoc.latest_replication_date instanceof Date);
    test.ok(db.medic.insert.calledWith(infoDoc));
    test.done();
  });
};

exports['If no info doc exists, create one from audit records'] = test => {
  const change = {id: 'foo'};

  const auditDoc = {
    history: [{
      action: 'something-that-isnt-created',
    }, {
      action: 'create',
      timestamp: new Date()
    }]
  };

  db.medic.get.callsArgWith(1, {statusCode: 404});
  audit.get.callsArgWith(1, null, {doc: auditDoc});
  db.medic.insert.callsArg(1);

  transition.onMatch(change, db, audit, (err) => {
    test.ok(!err);
    test.ok(db.medic.get.calledWith('foo-info'));
    test.ok(audit.get.calledWith('foo'));
    test.equal(db.medic.insert.callCount, 1);
    const infoDoc = db.medic.insert.args[0][0];
    test.equal(infoDoc._id, 'foo-info');
    test.equal(infoDoc.type, 'info');
    test.ok(infoDoc.initial_replication_date);
    test.ok(infoDoc.latest_replication_date);
    test.equal(infoDoc.initial_replication_date, auditDoc.history[1].timestamp);
    test.done();
  });
};
