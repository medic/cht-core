var sinon = require('sinon');

exports['saving a new `data_record` creates a new `audit_record`'] = function(test) {
  test.expect(16);
  
  var userName = 'John Key';
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
    bulkSave: function(docs, options, callback) {
      callback(null);
    },
    newUUID: function(count, callback) {
      callback(null, docId);
    }
  };
  var saveDoc = sinon.spy(db, 'saveDoc');
  var bulkSave = sinon.spy(db, 'bulkSave');
  var newUUID = sinon.spy(db, 'newUUID');
  var session = {};
  var sessionInfo = sinon.stub(session, 'info').callsArgWith(0, null, {
    userCtx: {name: userName}
  });
  var audit = require('couchdb-audit/kanso')
    .withSession(session)
    .withKanso(db);

  audit.saveDoc(doc1, function(err, result) {
    test.equal(err, null);
    test.equal(result.id, docId);
  });

  test.equal(bulkSave.callCount, 1);
  test.equal(saveDoc.callCount, 1);
  test.equal(newUUID.callCount, 1);
  test.equal(sessionInfo.callCount, 1);
  var auditRecord = bulkSave.firstCall.args[0];
  var dataRecord = saveDoc.firstCall.args[0];
  test.equal(auditRecord[0].type, 'audit_record');
  test.equal(auditRecord[0].record_id, docId);
  test.equal(auditRecord[0].history.length, 1);
  test.equal(auditRecord[0].history[0].action, 'create');
  test.equal(auditRecord[0].history[0].user, userName);
  test.ok(!!auditRecord[0].history[0].timestamp);
  test.equal(auditRecord[0].history[0].doc._id, docId);
  test.equal(auditRecord[0].history[0].doc._rev, 'current'); // we don't know the rev yet
  test.equal(dataRecord.type, 'data_record');
  test.equal(dataRecord._id, docId);
  test.done();

};

exports['saving a new `data_record` with id set creates a new `audit_record`'] = function(test) {
  test.expect(15);
  
  var userName = 'John Key';
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
    bulkSave: function(docs, options, callback) {
      callback(null);
    },
    getView: function(appname, view, query, callback) {
      callback(null, {'rows':[]});
    }
  };
  var saveDoc = sinon.spy(db, 'saveDoc');
  var bulkSave = sinon.spy(db, 'bulkSave');
  var getView = sinon.spy(db, 'getView');
  var session = {};
  var sessionInfo = sinon.stub(session, 'info').callsArgWith(0, null, {
    userCtx: {name: userName}
  });
  var audit = require('couchdb-audit/kanso')
    .withSession(session)
    .withKanso(db);

  audit.saveDoc(doc1, function(err, result) {
    test.equal(err, null);
    test.equal(result.id, docId);
  });

  test.equal(bulkSave.callCount, 1);
  test.equal(saveDoc.callCount, 1);
  test.equal(getView.callCount, 1);
  test.equal(sessionInfo.callCount, 1);
  var auditRecord = bulkSave.firstCall.args[0];
  var dataRecord = saveDoc.firstCall.args[0];
  test.equal(auditRecord[0].type, 'audit_record');
  test.equal(auditRecord[0].record_id, docId);
  test.equal(auditRecord[0].history.length, 1);
  test.equal(auditRecord[0].history[0].action, 'create');
  test.equal(auditRecord[0].history[0].user, userName);
  test.equal(auditRecord[0].history[0].doc._id, docId);
  test.equal(auditRecord[0].history[0].doc._rev, 'current'); // we don't know the rev yet
  test.equal(dataRecord.type, 'data_record');
  test.equal(dataRecord._id, docId);
  test.done();
};

exports['updating a `data_record` updates the `audit_record`'] = function(test) {
  test.expect(17);

  var docId = 123;
  var user1 = 'joe';
  var rev1 = '1-ASD';
  var doc1 = {
    _id: docId,
    type: 'data_record',
    foo: 'baz'
  };
  var user2 = 'hax';
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
    bulkSave: function(docs, options, callback) {
      callback(null);
    },
    getView: function(appname, view, query, callback) {
      callback(null, {'rows':[{
        doc: {
          type: 'audit_record',
          record_id: docId,
          history: [{
            action: 'create',
            user: user1,
            doc: doc1
          }]
        }
      }]});
    }
  };
  var saveDoc = sinon.spy(db, 'saveDoc');
  var bulkSave = sinon.spy(db, 'bulkSave');
  var getView = sinon.spy(db, 'getView');
  var session = {};
  sinon.stub(session, 'info').callsArgWith(0, null, {
    userCtx: {name: user2}
  });
  var audit = require('couchdb-audit/kanso')
    .withSession(session)
    .withKanso(db);

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
  test.equal(auditRecord[0].history[0].user, user1);
  test.equal(auditRecord[0].history[0].doc.foo, 'baz');
  test.equal(auditRecord[0].history[0].doc._rev, rev1);
  test.equal(auditRecord[0].history[1].action, 'update');
  test.equal(auditRecord[0].history[1].user, user2);
  test.equal(auditRecord[0].history[1].doc.foo, 'bar');
  test.equal(auditRecord[0].history[1].doc._rev, 'current');
  test.equal(dataRecord._rev, rev1);
  test.done();
};

exports['deleting a `data_record` updates the `audit_record`'] = function(test) {
  test.expect(15);

  var docId = 123;
  var user1 = 'admin';
  var doc1 = {
    _id: docId,
    type: 'data_record'
  };
  var user2 = 'hax';
  var doc2 = {
    _id: docId,
    type: 'data_record',
    _deleted: true
  };

  var db = { 
    saveDoc: function(doc, callback) { 
      callback(null, {id: docId});
    },
    bulkSave: function(docs, options, callback) {
      callback(null);
    },
    getView: function(appname, view, query, callback) {
      callback(null, {'rows':[{
        doc: {
          type: 'audit_record',
          record_id: docId,
          history: [{
            action: 'create',
            user: user1,
            doc: doc1
          }]
        }
      }]});
    }
  };
  var saveDoc = sinon.spy(db, 'saveDoc');
  var bulkSave = sinon.spy(db, 'bulkSave');
  var getView = sinon.spy(db, 'getView');
  var session = {};
  sinon.stub(session, 'info').callsArgWith(0, null, {
    userCtx: {name: user2}
  });
  var audit = require('couchdb-audit/kanso')
    .withSession(session)
    .withKanso(db);

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
  test.equal(auditRecord[0].history[0].user, user1);
  test.equal(auditRecord[0].history[0].doc, doc1);
  test.equal(auditRecord[0].history[1].action, 'delete');
  test.equal(auditRecord[0].history[1].user, user2);
  test.equal(auditRecord[0].history[1].doc._deleted, true);
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
    bulkSave: function(docs, options, callback) {
      callback(null);
    },
    getView: function(appname, view, query, callback) {
      callback(null, {'rows':[]});
    },
    getDoc: function(id, callback) {
      callback(null, doc1);
    }
  };
  var saveDoc = sinon.spy(db, 'saveDoc');
  var bulkSave = sinon.spy(db, 'bulkSave');
  var getView = sinon.spy(db, 'getView');
  var getDoc = sinon.spy(db, 'getDoc');
  var session = {};
  sinon.stub(session, 'info').callsArgWith(0, null, {
    userCtx: {name: 'joe'}
  });
  var audit = require('couchdb-audit/kanso')
    .withSession(session)
    .withKanso(db);

  audit.saveDoc(doc2, function(err, result) {
    test.equal(err, null);
    test.equal(result.id, docId);
  });

  test.equal(getView.callCount, 1);
  test.equal(saveDoc.callCount, 1);
  test.equal(getDoc.callCount, 1);
  var auditRecord = bulkSave.firstCall.args[0];
  var dataRecord = saveDoc.firstCall.args[0];
  test.equal(auditRecord[0].type, 'audit_record');
  test.equal(auditRecord[0].record_id, docId);
  test.equal(auditRecord[0].history.length, 2);
  test.equal(auditRecord[0].history[0].action, 'create');
  test.equal(auditRecord[0].history[0].doc._rev, rev1);
  test.equal(auditRecord[0].history[1].action, 'update');
  test.equal(auditRecord[0].history[1].doc._rev, 'current');
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

  var db = { 
    bulkSave: function(doc, options, callback) { 
      callback(null);
    },
    getView: function(appname, view, query, callback) {
      callback(null, {'rows':[{
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
  var save = sinon.spy(db, 'bulkSave');
  var getView = sinon.spy(db, 'getView');
  var session = {};
  sinon.stub(session, 'info').callsArgWith(0, null, {
    userCtx: {name: 'joe'}
  });
  var audit = require('couchdb-audit/kanso')
    .withSession(session)
    .withKanso(db);

  audit.bulkSave([doc1, doc2], {all_or_nothing: true}, function(err, result) {
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
    bulkSave: function(doc, options, callback) { 
      callback(null);
    },
    getView: function(appname, view, query, callback) {
      callback(null, {'rows':[ ]});
    },
    newUUID: function(count, callback) {
      callback(null, docId2);
    },
    getDoc: function(id, callback) {
      callback(null, doc1);
    }
  };
  var save = sinon.spy(db, 'bulkSave');
  var getView = sinon.spy(db, 'getView');
  var newUUID = sinon.spy(db, 'newUUID');
  var session = {};
  sinon.stub(session, 'info').callsArgWith(0, null, {
    userCtx: {name: 'joe'}
  });
  var audit = require('couchdb-audit/kanso')
    .withSession(session)
    .withKanso(db);

  audit.bulkSave([doc1, doc2, doc3], function(err, result) {
    test.equal(err, null);
  });

  test.equal(getView.callCount, 2);
  test.equal(save.callCount, 2);
  test.equal(newUUID.callCount, 1);
  var auditRecord = save.firstCall.args[0];
  var dataRecord = save.secondCall.args[0];
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
    bulkSave: function(docs, options, callback) {
      callback(errMsg);
    },
    newUUID: function(count, callback) {
      callback(null, docId);
    }
  };
  var bulkSave = sinon.spy(db, 'bulkSave');
  var session = {};
  sinon.stub(session, 'info').callsArgWith(0, null, {
    userCtx: {name: 'joe'}
  });
  var audit = require('couchdb-audit/kanso')
    .withSession(session)
    .withKanso(db);
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
    getView: function(appname, view, query, callback) {
      callback(null, {'rows':[ expected ]});
    }
  };
  var getView = sinon.spy(db, 'getView');
  var audit = require('couchdb-audit/kanso').withKanso(db);
  audit.get(docId, function(err, result) {
    test.equal(err, null);
    test.equal(result, expected);
  });

  test.done();
};

exports['removeDoc updates the `audit_record` for the given `data_record`'] = function(test) {
  test.expect(14);
  
  var user1 = 'creator';
  var user2 = 'destroyer';
  var docId = 123;
  var doc1 = {
    _id: docId,
    _rev: '1-XXXXXXX',
    type: 'data_record'
  };

  var db = {
    getView: function(appname, view, query, callback) {
      callback(null, {'rows':[{
        doc: {
          type: 'audit_record',
          record_id: docId,
          history: [{
            action: 'create',
            user: user1,
            doc: doc1
          }]
        }
      }]});
    },
    bulkSave: function(docs, options, callback) {
      callback(null);
    },
    removeDoc: function(doc, callback) {
      callback(null);
    }
  };
  var removeDoc = sinon.spy(db, 'removeDoc');
  var bulkSave = sinon.spy(db, 'bulkSave');
  var session = {};
  var sessionInfo = sinon.stub(session, 'info').callsArgWith(0, null, {
    userCtx: {name: user2}
  });
  var audit = require('couchdb-audit/kanso')
    .withSession(session)
    .withKanso(db);

  audit.removeDoc(doc1, function(err) {
    test.equal(err, null);
  });

  test.equal(bulkSave.callCount, 1);
  test.equal(removeDoc.callCount, 1);
  test.equal(sessionInfo.callCount, 1);
  var auditRecord = bulkSave.firstCall.args[0];
  var dataRecord = removeDoc.firstCall.args[0];
  test.equal(auditRecord[0].type, 'audit_record');
  test.equal(auditRecord[0].record_id, docId);
  test.equal(auditRecord[0].history.length, 2);
  test.equal(auditRecord[0].history[0].action, 'create');
  test.equal(auditRecord[0].history[0].user, user1);
  test.equal(auditRecord[0].history[0].doc._id, docId);
  test.equal(auditRecord[0].history[1].action, 'delete');
  test.equal(auditRecord[0].history[1].user, user2);
  test.equal(auditRecord[0].history[1].doc._id, docId);
  test.equal(dataRecord._id, docId);
  test.done();
};