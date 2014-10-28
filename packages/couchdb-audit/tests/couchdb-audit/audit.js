var sinon = require('sinon'),
  user = 'someuser';

exports['bulkSave works with felix couchdb node module'] = function(test) {
  test.expect(18);

  var name = 'test';
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

  var db = {
    name: name,
    bulkDocs: function(options, callback) {
      callback(null);
    },
    view: function(appname, view, query, callback) {
      test.equal(name, appname);
      test.deepEqual(query.keys, [[docId1], [docId2]]);
      callback(null, {"rows":[{
        key: [docId1],
        doc: {
          type: 'audit_record',
          record_id: docId1,
          history: [{ action: 'create', doc: doc1 }]
        }
      }, {
        key: [docId2],
        doc: {
          type: 'audit_record',
          record_id: docId2,
          history: [{ action: 'create', doc: doc2 }]
        }
      }]});
    }
  };
  var save = sinon.spy(db, 'bulkDocs');
  var getView = sinon.spy(db, 'view');
  var audit = require('../../couchdb-audit/log').withNode(db, user);

  audit.bulkSave([doc1, doc2], {all_or_nothing: true}, function(err, result) {
    test.equal(err, null);
  });

  test.equal(getView.callCount, 1);
  test.equal(save.callCount, 2);
  var auditRecord = save.firstCall.args[0].docs;
  
  auditRecord.forEach(function(record) {
    test.equal(record.type, 'audit_record');
    test.equal(record.history.length, 2);
    test.equal(record.history[1].action, 'update');
    test.equal(record.history[1].user, user);
    if (record.record_id === docId1) {
      test.equal(record.history[0].doc, doc1);
    } else if (record.record_id === docId2) {
      test.equal(record.history[0].doc, doc2);
    } else {
      test.ok(false, 'Unexpected record_id');
    }
  });

  test.equal(save.secondCall.args[0].all_or_nothing, true);
  var dataRecords = save.secondCall.args[0].docs;
  test.equal(dataRecords[0], doc1);
  test.equal(dataRecords[1], doc2);
  test.done();
};


exports['saving a new `data_record` creates a new `audit_record`'] = function(test) {
  test.expect(15);
  
  var docId = 123;
  var doc1 = {
    _id: undefined,
    _rev: undefined,
    type: 'data_record'
  };

  var db = {
    saveDoc: function(doc, callback) { 
      callback(null, {id: docId}); 
    },
    bulkDocs: function(options, callback) {
      callback(null);
    },
    client: {
      uuids: function(count, callback) {
        callback(null, {uuids: [docId]});
      }
    }
  };
  var saveDoc = sinon.spy(db, 'saveDoc');
  var bulkSave = sinon.spy(db, 'bulkDocs');
  var newUUID = sinon.spy(db.client, 'uuids');
  var audit = require('../../couchdb-audit/log').withNode(db, user);

  audit.saveDoc(doc1, function(err, result) {
    test.equal(err, null);
    test.equal(result.id, docId);
  });

  test.equal(bulkSave.callCount, 1);
  test.equal(saveDoc.callCount, 1);
  test.equal(newUUID.callCount, 1);
  var auditRecord = bulkSave.firstCall.args[0].docs[0];
  var dataRecord = saveDoc.firstCall.args[0];
  test.equal(auditRecord.type, 'audit_record');
  test.equal(auditRecord.record_id, docId);
  test.equal(auditRecord.history.length, 1);
  test.equal(auditRecord.history[0].action, 'create');
  test.equal(auditRecord.history[0].user, user);
  test.ok(!!auditRecord.history[0].timestamp);
  test.equal(auditRecord.history[0].doc._id, docId);
  test.equal(auditRecord.history[0].doc._rev, 'current'); // we don't know the rev yet
  test.equal(dataRecord.type, 'data_record');
  test.equal(dataRecord._id, docId);
  test.done();

};

exports['saving a new `data_record` with id set creates a new `audit_record`'] = function(test) {
  test.expect(14);
  
  var docId = '251849';
  var doc1 = {
    _id: docId,
    _rev: undefined,
    type: 'data_record'
  };

  var db = {
    saveDoc: function(doc, callback) { 
      callback(null, {id: docId}); 
    },
    bulkDocs: function(options, callback) {
      callback(null);
    },
    view: function(appname, view, query, callback) {
      callback(null, {'rows':[]});
    }
  };
  var saveDoc = sinon.spy(db, 'saveDoc');
  var bulkSave = sinon.spy(db, 'bulkDocs');
  var getView = sinon.spy(db, 'view');
  var audit = require('../../couchdb-audit/log').withNode(db, user);

  audit.saveDoc(doc1, function(err, result) {
    test.equal(err, null);
    test.equal(result.id, docId);
  });

  test.equal(bulkSave.callCount, 1);
  test.equal(saveDoc.callCount, 1);
  test.equal(getView.callCount, 1);
  var auditRecord = bulkSave.firstCall.args[0].docs[0];
  var dataRecord = saveDoc.firstCall.args[0];
  test.equal(auditRecord.type, 'audit_record');
  test.equal(auditRecord.record_id, docId);
  test.equal(auditRecord.history.length, 1);
  test.equal(auditRecord.history[0].action, 'create');
  test.equal(auditRecord.history[0].user, user);
  test.equal(auditRecord.history[0].doc._id, docId);
  test.equal(auditRecord.history[0].doc._rev, 'current'); // we don't know the rev yet
  test.equal(dataRecord.type, 'data_record');
  test.equal(dataRecord._id, docId);
  test.done();
};

exports['updating a `data_record` updates the `audit_record`'] = function(test) {
  test.expect(18);

  var docId = 123;
  var rev1 = '1-ASD';
  var doc1 = {
    _id: docId,
    type: 'data_record',
    foo: 'baz'
  };
  var doc2 = {
    _id: docId,
    _rev: rev1,
    type: 'data_record',
    foo: 'bar'
  };

  var db = {
    saveDoc: function(doc, callback) { 
      callback(null, {id: docId});
    },
    bulkDocs: function(options, callback) {
      callback(null);
    },
    view: function(appname, view, query, callback) {
      test.deepEqual(query.keys, [[docId]]);
      callback(null, {"rows":[{
        key: [docId],
        doc: {
          type: 'audit_record',
          record_id: docId,
          history: [{ action: 'create', user: user, doc: doc1 }]
        }
      }]});
    }
  };
  var saveDoc = sinon.spy(db, 'saveDoc');
  var bulkSave = sinon.spy(db, 'bulkDocs');
  var getView = sinon.spy(db, 'view');
  var audit = require('../../couchdb-audit/log').withNode(db, user);

  audit.saveDoc(doc2, function(err, result) {
    test.equal(err, null);
    test.equal(result.id, docId);
  });

  test.equal(getView.callCount, 1);
  test.equal(saveDoc.callCount, 1);
  test.equal(bulkSave.callCount, 1);
  var auditRecord = bulkSave.firstCall.args[0].docs[0];
  var dataRecord = saveDoc.firstCall.args[0];
  test.equal(auditRecord.type, 'audit_record');
  test.equal(auditRecord.record_id, docId);
  test.equal(auditRecord.history.length, 2);
  test.equal(auditRecord.history[0].action, 'create');
  test.equal(auditRecord.history[0].user, user);
  test.equal(auditRecord.history[0].doc.foo, 'baz');
  test.equal(auditRecord.history[0].doc._rev, rev1);
  test.equal(auditRecord.history[1].action, 'update');
  test.equal(auditRecord.history[1].user, user);
  test.equal(auditRecord.history[1].doc.foo, 'bar');
  test.equal(auditRecord.history[1].doc._rev, 'current');
  test.equal(dataRecord._rev, rev1);
  test.done();
};

exports['deleting a `data_record` updates the `audit_record`'] = function(test) {
  test.expect(16);

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

  var db = { 
    saveDoc: function(doc, callback) { 
      callback(null, {id: docId});
    },
    bulkDocs: function(options, callback) {
      callback(null);
    },
    view: function(appname, view, query, callback) {
      test.deepEqual(query.keys, [[docId]]);
      callback(null, {"rows":[{
        key: [docId],
        doc: {
          type: 'audit_record',
          record_id: docId,
          history: [{ action: 'create', user: user, doc: doc1 }]
        }
      }]});
    }
  };
  var saveDoc = sinon.spy(db, 'saveDoc');
  var bulkSave = sinon.spy(db, 'bulkDocs');
  var getView = sinon.spy(db, 'view');
  var audit = require('../../couchdb-audit/log').withNode(db, user);

  audit.saveDoc(doc2, function(err, result) {
    test.equal(err, null);
    test.equal(result.id, docId);
  });

  test.equal(getView.callCount, 1);
  test.equal(saveDoc.callCount, 1);
  test.equal(bulkSave.callCount, 1);
  var auditRecord = bulkSave.firstCall.args[0].docs[0];
  var dataRecord = saveDoc.firstCall.args[0];
  test.equal(auditRecord.type, 'audit_record');
  test.equal(auditRecord.record_id, docId);
  test.equal(auditRecord.history.length, 2);
  test.equal(auditRecord.history[0].action, 'create');
  test.equal(auditRecord.history[0].user, user);
  test.equal(auditRecord.history[0].doc, doc1);
  test.equal(auditRecord.history[1].action, 'delete');
  test.equal(auditRecord.history[1].user, user);
  test.equal(auditRecord.history[1].doc._deleted, true);
  test.equal(dataRecord, doc2);
  test.done();
};

exports['updating a `data_record` creates an `audit_record` if required'] = function(test) {
  test.expect(13);

  var docId = 123;
  var rev1 = '1-XXXXXXX';
  var doc1 = {
    _id: docId,
    _rev: rev1,
    type: 'data_record'
  };
  var doc2 = {
    _id: docId,
    _rev: '1-XXXXXXX',
    type: 'data_record',
    foo: 'bar'
  };

  var db = { 
    saveDoc: function(doc, callback) { 
      callback(null, {id: docId});
    },
    bulkDocs: function(options, callback) {
      callback(null);
    },
    view: function(appname, view, query, callback) {
      callback(null, {'rows':[]});
    },
    getDoc: function(id, callback) {
      callback(null, doc1);
    }
  };
  var saveDoc = sinon.spy(db, 'saveDoc');
  var bulkSave = sinon.spy(db, 'bulkDocs');
  var getView = sinon.spy(db, 'view');
  var getDoc = sinon.spy(db, 'getDoc');
  var audit = require('../../couchdb-audit/log').withNode(db, user);

  audit.saveDoc(doc2, function(err, result) {
    test.equal(err, null);
    test.equal(result.id, docId);
  });

  test.equal(getView.callCount, 1);
  test.equal(saveDoc.callCount, 1);
  test.equal(getDoc.callCount, 1);
  var auditRecord = bulkSave.firstCall.args[0].docs[0];
  var dataRecord = saveDoc.firstCall.args[0];
  test.equal(auditRecord.type, 'audit_record');
  test.equal(auditRecord.record_id, docId);
  test.equal(auditRecord.history.length, 2);
  test.equal(auditRecord.history[0].action, 'create');
  test.equal(auditRecord.history[0].doc._rev, rev1);
  test.equal(auditRecord.history[1].action, 'update');
  test.equal(auditRecord.history[1].doc._rev, 'current');
  test.equal(dataRecord, doc2);
  test.done();
};

exports['bulkSave updates all relevant `audit_record` docs'] = function(test) {
  test.expect(14);

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

  var db = { 
    bulkDocs: function(options, callback) {
      callback(null);
    },
    view: function(appname, view, query, callback) {
      test.deepEqual(query.keys, [[docId1], [docId2]]);
      callback(null, {"rows":[{
        key: [docId1],
        doc: {
          type: 'audit_record',
          record_id: docId1,
          history: [{ action: 'create', doc: doc1 }]
        }
      }, {
        key: [docId2],
        doc: {
          type: 'audit_record',
          record_id: docId2,
          history: [{ action: 'create', doc: doc2 }]
        }
      }]});
    }
  };
  var save = sinon.spy(db, 'bulkDocs');
  var getView = sinon.spy(db, 'view');
  var audit = require('../../couchdb-audit/log').withNode(db, user);

  audit.bulkSave([doc1, doc2], {all_or_nothing: true}, function(err, result) {
    test.equal(err, null);
  });

  test.equal(getView.callCount, 1);
  test.equal(save.callCount, 2);
  var auditRecord = save.firstCall.args[0].docs;
  var dataRecord = save.secondCall.args[0].docs;
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
  test.expect(25);

  var docId1 = 123;
  var docId2 = 456;
  var docId3 = 789;

  // doc with no audit record
  var doc1 = {
    _id: docId1,
    _rev: '1-XXXXXXX',
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
    _rev: '1-XXXXXXX',
    type: 'data_record',
    foo: 'bar',
    _deleted: true
  };

  var db = { 
    bulkDocs: function(options, callback) {
      callback(null);
    },
    view: function(appname, view, query, callback) {
      callback(null, {'rows':[ ]});
    },
    getDoc: function(id, callback) {
      callback(null, doc1);
    },
    client: {
      uuids: function(count, callback) {
        callback(null, {uuids: [docId2]});
      }
    }
  };
  var save = sinon.spy(db, 'bulkDocs');
  var getView = sinon.spy(db, 'view');
  var newUUID = sinon.spy(db.client, 'uuids');
  var audit = require('../../couchdb-audit/log').withNode(db, user);

  audit.bulkSave([doc1, doc2, doc3], function(err, result) {
    test.equal(err, null);
  });

  test.equal(getView.callCount, 1);
  test.equal(save.callCount, 2);
  test.equal(newUUID.callCount, 1);
  var auditRecord = save.firstCall.args[0].docs;
  var dataRecord = save.secondCall.args[0].docs;
  test.equal(auditRecord.length, 3);
  auditRecord.forEach(function(record) {
    test.equal(record.type, 'audit_record');
    if (record.record_id === docId1) {
      test.equal(record.history.length, 2);
      test.equal(record.history[0].action, 'create');
      test.equal(record.history[0].doc._id, docId1);
      test.equal(record.history[1].action, 'update');
      test.equal(record.history[1].doc._id, docId1);
    } else if (record.record_id === docId2) {
      test.equal(record.history.length, 1);
      test.equal(record.history[0].action, 'create');
      test.equal(record.history[0].doc._id, docId2);
    } else if (record.record_id === docId3) {
      test.equal(record.history.length, 2);
      test.equal(record.history[0].action, 'create');
      test.equal(record.history[0].doc._id, docId1);
      test.equal(record.history[1].action, 'delete');
      test.equal(record.history[1].doc._id, docId3);
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

  var db = { 
    bulkDocs: function(options, callback) {
      callback(errMsg);
    },
    client: {
      uuids: function(count, callback) {
        callback(null, {uuids: [docId]});
      }
    }
  };
  var bulkSave = sinon.spy(db, 'bulkDocs');
  var audit = require('../../couchdb-audit/log').withNode(db, user);
  audit.saveDoc(doc1, function(err, result) {
    test.equal(err, 'Failed saving audit record. ' + errMsg);
  });

  test.equal(bulkSave.callCount, 1);
  test.done();
};

exports['get returns the `audit_record` for the given `data_record`'] = function(test) {
  test.expect(2);

  var docId = 123;
  var expected = {
    doc: {
      record_id: docId
    }
  };
  
  var db = {
    view: function(appname, view, query, callback) {
      callback(null, {'rows':[ expected ]});
    }
  };
  var getView = sinon.spy(db, 'view');
  var audit = require('../../couchdb-audit/log').withNode(db, user);
  audit.get(docId, function(err, result) {
    test.equal(err, null);
    test.equal(result, expected);
  });

  test.done();
};

exports['removeDoc updates the `audit_record` for the given `data_record`'] = function(test) {
  test.expect(14);
  
  var docId = 123;
  var doc1 = {
    _id: docId,
    _rev: '1-XXXXXXX',
    type: 'data_record'
  };

  var db = {
    view: function(appname, view, query, callback) {
      test.deepEqual(query.keys, [[docId]]);
      callback(null, {"rows":[{
        key: [docId],
        doc: {
          type: 'audit_record',
          record_id: docId,
          history: [{ action: 'create', user: user, doc: doc1 }]
        }
      }]});
    },
    bulkDocs: function(options, callback) {
      callback(null);
    },
    removeDoc: function(db, options, callback) {
      callback(null);
    }
  };
  var removeDoc = sinon.spy(db, 'removeDoc');
  var bulkSave = sinon.spy(db, 'bulkDocs');
  var audit = require('../../couchdb-audit/log').withNode(db, user);

  audit.removeDoc(doc1, function(err) {
    test.equal(err, null);
  });

  test.equal(bulkSave.callCount, 1);
  test.equal(removeDoc.callCount, 1);
  var auditRecord = bulkSave.firstCall.args[0].docs[0];
  var dataRecord = removeDoc.firstCall.args[0];
  test.equal(auditRecord.type, 'audit_record');
  test.equal(auditRecord.record_id, docId);
  test.equal(auditRecord.history.length, 2);
  test.equal(auditRecord.history[0].action, 'create');
  test.equal(auditRecord.history[0].user, user);
  test.equal(auditRecord.history[0].doc._id, docId);
  test.equal(auditRecord.history[1].action, 'delete');
  test.equal(auditRecord.history[1].user, user);
  test.equal(auditRecord.history[1].doc._id, docId);
  test.equal(dataRecord, docId);
  test.done();
};