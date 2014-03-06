var audit = require('audit/log'),
  db = require('db'),
  sinon = require('sinon');

exports.tearDown = function (callback) {
  if (db.use.restore) {
    db.use.restore();
  }
  if (db.newUUID.restore) {
    db.newUUID.restore();
  }
  callback();
}

exports['saving a new `data_record` creates a new `audit_record`'] = function(test) {
  test.expect(10);
  
  var docId = 123;
  var doc1 = {
    _id: undefined,
    type: 'data_record'
  };

  var appdb = { saveDoc: function(doc, callback) { 
    callback(null, {id: docId}); 
  } };
  var save = sinon.spy(appdb, 'saveDoc');
  sinon.stub(db, 'use').returns(appdb);
  sinon.stub(db, 'newUUID').yields(null, docId);
  audit.saveDoc(doc1, function(err, result) {
    test.equal(err, null);
    test.equal(result.id, docId);
  });

  test.equal(save.callCount, 2);
  var auditRecord = save.firstCall.args[0];
  var dataRecord = save.secondCall.args[0];
  test.equal(auditRecord.type, 'audit_record');
  test.equal(auditRecord.record_id, docId);
  test.equal(auditRecord.history.length, 1);
  test.equal(auditRecord.history[0].action, 'create');
  test.equal(auditRecord.history[0].doc._id, docId);
  test.equal(dataRecord.type, 'data_record');
  test.equal(dataRecord._id, docId);
  test.done();
};

exports['updating a `data_record` updates the `audit_record`'] = function(test) {
  test.expect(12);

  var docId = 123;
  var doc1 = {
    _id: docId,
    type: 'data_record'
  };
  var doc2 = {
    _id: docId,
    type: 'data_record',
    foo: 'bar'
  };

  var appdb = { 
    saveDoc: function(doc, callback) { 
      callback(null, {id: docId});
    },
    getView: function(appname, view, query, callback) {
      callback(null, {"rows":[{
        type: 'audit_record',
        record_id: docId,
        history: [{
          action: 'create',
          doc: doc1
        }]
      }]});
    }
  };
  var save = sinon.spy(appdb, 'saveDoc');
  var getView = sinon.spy(appdb, 'getView');
  sinon.stub(db, 'use').returns(appdb);
  audit.saveDoc(doc2, function(err, result) {
    test.equal(err, null);
    test.equal(result.id, docId);
  });

  test.equal(getView.callCount, 1);
  test.equal(save.callCount, 2);
  var auditRecord = save.firstCall.args[0];
  var dataRecord = save.secondCall.args[0];
  test.equal(auditRecord.type, 'audit_record');
  test.equal(auditRecord.record_id, docId);
  test.equal(auditRecord.history.length, 2);
  test.equal(auditRecord.history[0].action, 'create');
  test.equal(auditRecord.history[0].doc, doc1);
  test.equal(auditRecord.history[1].action, 'update');
  test.equal(auditRecord.history[1].doc, doc2);
  test.equal(dataRecord, doc2);
  test.done();
};

exports['deleting a `data_record` updates the `audit_record`'] = function(test) {
  test.expect(12);

  var docId = 123;
  var doc1 = {
    _id: docId,
    type: 'data_record'
  };
  var doc2 = {
    _id: docId,
    type: 'data_record',
    _deleted: true
  };

  var appdb = { 
    saveDoc: function(doc, callback) { 
      callback(null, {id: docId});
    },
    getView: function(appname, view, query, callback) {
      callback(null, {"rows":[{
        type: 'audit_record',
        record_id: docId,
        history: [{
          action: 'create',
          doc: doc1
        }]
      }]});
    }
  };
  var save = sinon.spy(appdb, 'saveDoc');
  var getView = sinon.spy(appdb, 'getView');
  sinon.stub(db, 'use').returns(appdb);
  audit.saveDoc(doc2, function(err, result) {
    test.equal(err, null);
    test.equal(result.id, docId);
  });

  test.equal(getView.callCount, 1);
  test.equal(save.callCount, 2);
  var auditRecord = save.firstCall.args[0];
  var dataRecord = save.secondCall.args[0];
  test.equal(auditRecord.type, 'audit_record');
  test.equal(auditRecord.record_id, docId);
  test.equal(auditRecord.history.length, 2);
  test.equal(auditRecord.history[0].action, 'create');
  test.equal(auditRecord.history[0].doc, doc1);
  test.equal(auditRecord.history[1].action, 'delete');
  test.equal(auditRecord.history[1].doc, doc2);
  test.equal(dataRecord, doc2);
  test.done();
};

exports['updating a `data_record` creates an `audit_record` if required'] = function(test) {
  test.expect(10);

  var docId = 123;
  var doc1 = {
    _id: docId,
    type: 'data_record'
  };
  var doc2 = {
    _id: docId,
    type: 'data_record',
    foo: 'bar'
  };

  var appdb = { 
    saveDoc: function(doc, callback) { 
      callback(null, {id: docId});
    },
    getView: function(appname, view, query, callback) {
      callback(null, {"rows":[]});
    }
  };
  var save = sinon.spy(appdb, 'saveDoc');
  var getView = sinon.spy(appdb, 'getView');
  sinon.stub(db, 'use').returns(appdb);
  audit.saveDoc(doc2, function(err, result) {
    test.equal(err, null);
    test.equal(result.id, docId);
  });

  test.equal(getView.callCount, 1);
  test.equal(save.callCount, 2);
  var auditRecord = save.firstCall.args[0];
  var dataRecord = save.secondCall.args[0];
  test.equal(auditRecord.type, 'audit_record');
  test.equal(auditRecord.record_id, docId);
  test.equal(auditRecord.history.length, 1);
  test.equal(auditRecord.history[0].action, 'update');
  test.equal(auditRecord.history[0].doc, doc2);
  test.equal(dataRecord, doc2);
  test.done();
};

// TODO write this test
exports['bulkSave updates all relevant `audit_record` docs'] = function(test) {
  test.expect(10);
  test.ok(false);

  var docId1 = 123;
  var docId2 = 456;
  var doc1 = {
    _id: docId1,
    type: 'data_record',
    foo: 'baz'
  };
  var doc2 = {
    _id: docId2,
    type: 'data_record',
    foo: 'bar'
  };

  var appdb = { 
    saveDoc: function(doc, callback) { 
      callback(null, {id: docId});
    },
    getView: function(appname, view, query, callback) {
      callback(null, {"rows":[]});
    }
  };
  var save = sinon.spy(appdb, 'saveDoc');
  var getView = sinon.spy(appdb, 'getView');
  sinon.stub(db, 'use').returns(appdb);
  audit.bulkSave([doc1, doc2], function(err, result) {
    test.equal(err, null);
  });

  test.equal(getView.callCount, 1);
  test.equal(save.callCount, 2);
  var auditRecord = save.firstCall.args[0];
  var dataRecord = save.secondCall.args[0];
  test.equal(auditRecord.type, 'audit_record');
  test.equal(auditRecord.record_id, docId);
  test.equal(auditRecord.history.length, 1);
  test.equal(auditRecord.history[0].action, 'update');
  test.equal(auditRecord.history[0].doc, doc2);
  test.equal(dataRecord, doc2);
  test.done();
};