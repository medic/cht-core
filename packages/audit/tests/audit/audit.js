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
  test.expect(11);
  
  var docId = 123;
  var doc1 = {
    _id: undefined,
    type: 'data_record'
  };

  var appdb = { 
    saveDoc: function(doc, callback) { 
      callback(null, {id: docId}); 
    },
    bulkSave: function(docs, callback) {
      callback(null);
    }
  };
  var saveDoc = sinon.spy(appdb, 'saveDoc');
  var bulkSave = sinon.spy(appdb, 'bulkSave');
  sinon.stub(db, 'use').returns(appdb);
  sinon.stub(db, 'newUUID').yields(null, docId);
  audit.saveDoc(doc1, function(err, result) {
    test.equal(err, null);
    test.equal(result.id, docId);
  });

  test.equal(saveDoc.callCount, 1);
  test.equal(bulkSave.callCount, 1);
  var auditRecord = bulkSave.firstCall.args[0];
  var dataRecord = saveDoc.firstCall.args[0];
  test.equal(auditRecord[0].type, 'audit_record');
  test.equal(auditRecord[0].record_id, docId);
  test.equal(auditRecord[0].history.length, 1);
  test.equal(auditRecord[0].history[0].action, 'create');
  test.equal(auditRecord[0].history[0].doc._id, docId);
  test.equal(dataRecord.type, 'data_record');
  test.equal(dataRecord._id, docId);
  test.done();
};

exports['updating a `data_record` updates the `audit_record`'] = function(test) {
  test.expect(13);

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
    bulkSave: function(docs, callback) {
      callback(null);
    },
    getView: function(appname, view, query, callback) {
      callback(null, {"rows":[{
        doc: {
          type: 'audit_record',
          record_id: docId,
          history: [{
            action: 'create',
            doc: doc1
          }]
        }
      }]});
    }
  };
  var saveDoc = sinon.spy(appdb, 'saveDoc');
  var bulkSave = sinon.spy(appdb, 'bulkSave');
  var getView = sinon.spy(appdb, 'getView');
  sinon.stub(db, 'use').returns(appdb);
  audit.saveDoc(doc2, function(err, result) {
    test.equal(err, null);
    test.equal(result.id, docId);
  });

  test.equal(getView.callCount, 1);
  test.equal(saveDoc.callCount, 1);
  test.equal(bulkSave.callCount, 1);
  var auditRecord = bulkSave.firstCall.args[0];
  var dataRecord = saveDoc.firstCall.args[0];
  test.equal(auditRecord[0].type, 'audit_record');
  test.equal(auditRecord[0].record_id, docId);
  test.equal(auditRecord[0].history.length, 2);
  test.equal(auditRecord[0].history[0].action, 'create');
  test.equal(auditRecord[0].history[0].doc, doc1);
  test.equal(auditRecord[0].history[1].action, 'update');
  test.equal(auditRecord[0].history[1].doc, doc2);
  test.equal(dataRecord, doc2);
  test.done();
};

exports['deleting a `data_record` updates the `audit_record`'] = function(test) {
  test.expect(13);

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
    bulkSave: function(docs, callback) {
      callback(null);
    },
    getView: function(appname, view, query, callback) {
      callback(null, {"rows":[{
        doc: {
          type: 'audit_record',
          record_id: docId,
          history: [{
            action: 'create',
            doc: doc1
          }]
        }
      }]});
    }
  };
  var saveDoc = sinon.spy(appdb, 'saveDoc');
  var bulkSave = sinon.spy(appdb, 'bulkSave');
  var getView = sinon.spy(appdb, 'getView');
  sinon.stub(db, 'use').returns(appdb);
  audit.saveDoc(doc2, function(err, result) {
    test.equal(err, null);
    test.equal(result.id, docId);
  });

  test.equal(getView.callCount, 1);
  test.equal(saveDoc.callCount, 1);
  test.equal(bulkSave.callCount, 1);
  var auditRecord = bulkSave.firstCall.args[0];
  var dataRecord = saveDoc.firstCall.args[0];
  test.equal(auditRecord[0].type, 'audit_record');
  test.equal(auditRecord[0].record_id, docId);
  test.equal(auditRecord[0].history.length, 2);
  test.equal(auditRecord[0].history[0].action, 'create');
  test.equal(auditRecord[0].history[0].doc, doc1);
  test.equal(auditRecord[0].history[1].action, 'delete');
  test.equal(auditRecord[0].history[1].doc, doc2);
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
    bulkSave: function(docs, callback) {
      callback(null);
    },
    getView: function(appname, view, query, callback) {
      callback(null, {"rows":[]});
    }
  };
  var saveDoc = sinon.spy(appdb, 'saveDoc');
  var bulkSave = sinon.spy(appdb, 'bulkSave');
  var getView = sinon.spy(appdb, 'getView');
  sinon.stub(db, 'use').returns(appdb);
  audit.saveDoc(doc2, function(err, result) {
    test.equal(err, null);
    test.equal(result.id, docId);
  });

  test.equal(getView.callCount, 1);
  test.equal(saveDoc.callCount, 1);
  var auditRecord = bulkSave.firstCall.args[0];
  var dataRecord = saveDoc.firstCall.args[0];
  test.equal(auditRecord[0].type, 'audit_record');
  test.equal(auditRecord[0].record_id, docId);
  test.equal(auditRecord[0].history.length, 1);
  test.equal(auditRecord[0].history[0].action, 'update');
  test.equal(auditRecord[0].history[0].doc, doc2);
  test.equal(dataRecord, doc2);
  test.done();
};

exports['bulkSave updates all relevant `audit_record` docs'] = function(test) {
  test.expect(13);

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
    bulkSave: function(doc, callback) { 
      callback(null);
    },
    getView: function(appname, view, query, callback) {
      callback(null, {"rows":[{
        doc: {
          type: 'audit_record',
          record_id: (query.startkey === docId1) ? docId1 : docId2,
          history: [{
            action: 'create',
            doc: (query.startkey === docId1) ? doc1 : doc2
          }]
        }
      }]});
    }
  };
  var save = sinon.spy(appdb, 'bulkSave');
  var getView = sinon.spy(appdb, 'getView');
  sinon.stub(db, 'use').returns(appdb);
  audit.bulkSave([doc1, doc2], function(err, result) {
    test.equal(err, null);
  });

  test.equal(getView.callCount, 2);
  test.equal(save.callCount, 2);
  var auditRecord = save.firstCall.args[0];
  var dataRecord = save.secondCall.args[0];
  auditRecord.forEach(function(record) {
    test.equal(record.type, 'audit_record');
    test.equal(record.history.length, 2);
    test.equal(record.history[1].action, 'update');
    if (record.record_id === docId1) {
      test.equal(record.history[0].doc, doc1);
    } else if (record.record_id === docId2) {
      test.equal(record.history[0].doc, doc2);
    } else {
      test.ok(false, 'Unexpected record_id');
    }
  });
  test.equal(dataRecord[0], doc1);
  test.equal(dataRecord[1], doc2);
  test.done();
};


exports['bulkSave creates `audit_record` docs when needed'] = function(test) {
  test.expect(20);

  var docId1 = 123;
  var docId2 = 456;
  var docId3 = 789;

  // doc with no audit record
  var doc1 = {
    _id: docId1,
    type: 'data_record',
    foo: 'baz'
  };
  // new doc
  var doc2 = {
    type: 'data_record',
    foo: 'bar'
  };
  // deleted doc
  var doc3 = {
    _id: docId3,
    type: 'data_record',
    foo: 'bar',
    _deleted: true
  };

  var appdb = { 
    bulkSave: function(doc, callback) { 
      callback(null);
    },
    getView: function(appname, view, query, callback) {
      callback(null, {"rows":[ ]});
    }
  };
  var save = sinon.spy(appdb, 'bulkSave');
  var getView = sinon.spy(appdb, 'getView');
  sinon.stub(db, 'use').returns(appdb);
  sinon.stub(db, 'newUUID').yields(null, docId2);
  audit.bulkSave([doc1, doc2, doc3], function(err, result) {
    test.equal(err, null);
  });

  test.equal(getView.callCount, 2);
  test.equal(save.callCount, 2);
  var auditRecord = save.firstCall.args[0];
  var dataRecord = save.secondCall.args[0];
  test.equal(auditRecord.length, 3);
  auditRecord.forEach(function(record) {
    test.equal(record.type, 'audit_record');
    test.equal(record.history.length, 1);
    if (record.record_id === docId1) {
      test.equal(record.history[0].action, 'update');
      test.equal(record.history[0].doc, doc1);
    } else if (record.record_id === docId2) {
      test.equal(record.history[0].action, 'create');
      test.equal(record.history[0].doc, doc2);
    } else if (record.record_id === docId3) {
      test.equal(record.history[0].action, 'delete');
      test.equal(record.history[0].doc, doc3);
    } else {
      test.ok(false, 'Unexpected record_id');
    }
  });
  test.equal(dataRecord.length, 3);
  test.equal(dataRecord[0], doc1);
  test.equal(dataRecord[1], doc2);
  test.equal(dataRecord[2], doc3);
  test.done();
};

exports['when audit fails, doc is not saved and error returned'] = function(test) {
  test.expect(2);
  
  var errMsg = 'ERR1';
  var docId = 123;
  var doc1 = {
    _id: undefined,
    type: 'data_record'
  };

  var appdb = { 
    bulkSave: function(docs, callback) {
      callback(errMsg);
    }
  };
  var bulkSave = sinon.spy(appdb, 'bulkSave');
  sinon.stub(db, 'use').returns(appdb);
  sinon.stub(db, 'newUUID').yields(null, docId);
  audit.saveDoc(doc1, function(err, result) {
    test.equal(err, 'Failed saving audit record. ' + errMsg);
  });

  test.equal(bulkSave.callCount, 1);
  test.done();
};
