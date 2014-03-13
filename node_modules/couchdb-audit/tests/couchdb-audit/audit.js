var sinon = require('sinon'),
  appname = 'test',
  session = require('session'),
  appname = require('settings/root').name;

exports['bulkSave works with felix couchdb node module'] = function(test) {
  test.expect(16);

  var user = 'jack';
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
  var save = sinon.spy(db, 'bulkDocs');
  var getView = sinon.spy(db, 'view');
  var audit = require('couchdb-audit/log').withNode(appname, db, user);

  audit.bulkSave([doc1, doc2], {all_or_nothing: true}, function(err, result) {
    test.equal(err, null);
  });

  test.equal(getView.callCount, 2);
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
