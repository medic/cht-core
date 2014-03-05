var audit = require('audit/audit'),
  db = require('db'),
  session = require('session'),
  sinon = require('sinon');

exports.tearDown = function (callback) {
  if (db.use.restore) {
    db.use.restore();
  }
  if (session.info.restore) {
    session.info.restore();
  }
  callback();
}

exports['calling create saves new audit record'] = function(test) {
  test.expect(10);

  var docid = 123;
  var user = 'hacker';
  var doc1 = {_id: undefined};
 
  sinon.stub(db, 'use').returns({
    saveDoc: function(doc, callback) {
      test.equal(doc.type, 'audit_record', 'doc has correct type');
      test.equal(doc._id, undefined, 'doc has no id');
      test.equal(doc.record_id, docid, 'doc refers to original doc');
      test.equal(doc.history.length, 1, 'history has one entry');
      test.equal(doc.history[0].user, user, 'user recorded correctly');
      test.equal(doc.history[0].action, 'create', 'action is set correctly');
      test.equal(doc.history[0].doc, doc1, 'current doc is saved');
      test.ok(doc.history[0].reported_date, 'reported_date is set');
      callback(null, {record_id: docid});
    }
  });
  sinon.stub(session, 'info')
    .callsArgWith(0, null, {userCtx: {name: user}});

  audit.create(
    doc1,
    docid,
    function(err, response) {
      test.equal(err, null, 'no error');
      test.equal(response.record_id, docid, 'response is created doc');
    }
  );

  test.done();
};

exports['when getting user fails, log audit record anyway'] = function(test) {
  test.expect(10);

  var docid = 123;
  var doc1 = {_id: undefined};
 
  sinon.stub(db, 'use').returns({
    saveDoc: function(doc, callback) {
      test.equal(doc.type, 'audit_record', 'doc has correct type');
      test.equal(doc._id, undefined, 'doc has no id');
      test.equal(doc.record_id, docid, 'doc refers to original doc');
      test.equal(doc.history.length, 1, 'history has one entry');
      test.equal(doc.history[0].user, undefined, 'user recorded correctly');
      test.equal(doc.history[0].action, 'create', 'action is set correctly');
      test.equal(doc.history[0].doc, doc1, 'current doc is saved');
      test.ok(doc.history[0].reported_date, 'reported_date is set');
      callback(null, {record_id: docid});
    }
  });
  sinon.stub(session, 'info')
    .callsArgWith(0, 'no user logged in');

  audit.create(
    doc1,
    docid,
    function(err, response) {
      test.equal(err, null, 'no error');
      test.equal(response.record_id, docid, 'response is created doc');
    }
  );

  test.done();
};

exports['when existing audit record, append update to history'] = function(test) {
  test.expect(12);

  var docid = 123;
  var user1 = 'admin';
  var user2 = 'hacker';
  var doc1 = {_id: docid, x: 'foo'};
  var doc2 = {_id: docid, x: 'bar'};
  
  sinon.stub(db, 'use').returns({
    getView: function(appname, viewname, query, callback) {
      callback(null, {"rows":[{
        record_id: docid,
        history: [{
          user: user1,
          action: 'create',
          reported_date: '1Z',
          doc: doc1
        }]
      }]});
    },
    saveDoc: function(doc, callback) {
      test.equal(doc.record_id, docid, 'doc refers to original doc');
      test.equal(doc.history.length, 2, 'history has two entries');

      test.equal(doc.history[0].user, user1, 'user recorded correctly');
      test.equal(doc.history[0].action, 'create', 'action is set correctly');
      test.equal(doc.history[0].reported_date, '1Z', 'reported_date is set');
      test.equal(doc.history[0].doc, doc1, 'doc is set');

      test.equal(doc.history[1].user, user2, 'user recorded correctly');
      test.equal(doc.history[1].action, 'update', 'action is set correctly');
      test.ok(doc.history[1].reported_date, 'reported_date is set');
      test.equal(doc.history[1].doc, doc2, 'new doc is set');

      callback(null, {record_id: docid});
    }
  });
  sinon.stub(session, 'info')
    .callsArgWith(0, null, {userCtx: {name: user2}});

  audit.update(
    doc2,
    function(err, response) {
      test.equal(err, null, 'no error');
      test.equal(response.record_id, docid, 'response is created doc');
    }
  );

  test.done();
};

exports['when existing audit record is deleted, append delete to history'] = function(test) {
  test.expect(12);

  var docid = 123;
  var user1 = 'admin';
  var user2 = 'hacker';
  var doc1 = {_id: docid, x: 'foo'};
  var doc2 = {_id: docid, x: 'bar', _deleted: true};

  sinon.stub(db, 'use').returns({
    getView: function(appname, viewname, query, callback) {
      callback(null, {"rows":[{
        record_id: docid,
        history: [{
          user: user1,
          action: 'create',
          reported_date: '1Z',
          doc: doc1
        }]
      }]});
    },
    saveDoc: function(doc, callback) {
      test.equal(doc.record_id, docid, 'doc refers to original doc');
      test.equal(doc.history.length, 2, 'history has two entries');

      test.equal(doc.history[0].user, user1, 'user recorded correctly');
      test.equal(doc.history[0].action, 'create', 'action is set correctly');
      test.equal(doc.history[0].reported_date, '1Z', 'reported_date is set');
      test.equal(doc.history[0].doc, doc1, 'doc is set');

      test.equal(doc.history[1].user, user2, 'user recorded correctly');
      test.equal(doc.history[1].action, 'delete', 'action is set correctly');
      test.ok(doc.history[1].reported_date, 'reported_date is set');
      test.equal(doc.history[1].doc, doc2, 'new doc is set');

      callback(null, {record_id: docid});
    }
  });
  sinon.stub(session, 'info')
    .callsArgWith(0, null, {userCtx: {name: user2}});

  audit.update(
    doc2,
    function(err, response) {
      test.equal(err, null, 'no error');
      test.equal(response.record_id, docid, 'response is created doc');
    }
  );

  test.done();
};

exports['when update but no existing audit'] = function(test) {
  test.expect(8);

  var docid = 123;
  var user1 = 'admin';
  var doc1 = {_id: docid, x: 'foo'};

  sinon.stub(db, 'use').returns({
    getView: function(appname, viewname, query, callback) {
      callback(null, {"rows":[]});
    },
    saveDoc: function(doc, callback) {
      test.equal(doc.record_id, docid, 'doc refers to original doc');
      test.equal(doc.history.length, 1, 'history has one entry');

      test.equal(doc.history[0].user, user1, 'user recorded correctly');
      test.equal(doc.history[0].action, 'update', 'action is set correctly');
      test.ok(doc.history[0].reported_date, 'reported_date is set');
      test.equal(doc.history[0].doc, doc1, 'doc is set');

      callback(null, {record_id: docid});
    }
  });
  sinon.stub(session, 'info')
    .callsArgWith(0, null, {userCtx: {name: user1}});

  audit.update(
    doc1,
    function(err, response) {
      test.equal(err, null, 'no error');
      test.equal(response.record_id, docid, 'response is created doc');
    }
  );

  test.done();
};