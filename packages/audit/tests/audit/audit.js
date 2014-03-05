var audit = require('audit/audit'),
  db = require('db'),
  sinon = require('sinon');

exports['when no existing audit record, create one'] = function(test) {
  var docid = 123;
  var user = 'hacker';
  test.expect(11);
  sinon.stub(db, 'use').returns({
    getView: function(appname, viewname, query, callback) {
      test.equal(query.startkey[0], docid, 'correct startkey query param');
      test.equal(query.endkey[0], docid, 'correct endkey query param');
      callback(null, {"rows":[]});
    },
    saveDoc: function(doc, callback) {
      test.equal(doc.type, 'audit_record', 'doc has correct type');
      test.equal(doc._id, undefined, 'doc has no id');
      test.equal(doc.record_id, docid, 'doc refers to original doc');
      test.equal(doc.history.length, 1, 'history has one entry');
      test.equal(doc.history[0].user, user, 'user recorded correctly');
      test.equal(doc.history[0].action, 'create', 'action is set correctly');
      test.ok(doc.history[0].timestamp, 'timestamp is set');
      callback(null, {record_id: docid});
    }
  });
  audit.log(
    {_id: docid},
    {user: user},
    function(err, response) {
      test.equal(err, null, 'no error');
      test.equal(response.record_id, docid, 'response is created doc');
    }
  );
  test.done();
  db.use.restore();
};

exports['when existing audit record, append update to history'] = function(test) {
  var docid = 123;
  var user1 = 'admin';
  var user2 = 'hacker';
  test.expect(10);
  sinon.stub(db, 'use').returns({
    getView: function(appname, viewname, query, callback) {
      callback(null, {"rows":[{
        _id: docid,
        history: [{
          user: user1,
          action: 'create',
          timestamp: '1Z'
        }]
      }]});
    },
    saveDoc: function(doc, callback) {
      test.equal(doc._id, docid, 'doc has correct id');
      test.equal(doc.history.length, 2, 'history has two entries');

      test.equal(doc.history[0].user, user1, 'user recorded correctly');
      test.equal(doc.history[0].action, 'create', 'action is set correctly');
      test.equal(doc.history[0].timestamp, '1Z', 'timestamp is set');

      test.equal(doc.history[1].user, user2, 'user recorded correctly');
      test.equal(doc.history[1].action, 'update', 'action is set correctly');
      test.ok(doc.history[1].timestamp, 'timestamp is set');

      callback(null, {record_id: docid});
    }
  });
  audit.log(
    {_id: docid},
    {user: user2},
    function(err, response) {
      test.equal(err, null, 'no error');
      test.equal(response.record_id, docid, 'response is created doc');
    }
  );
  test.done();
  db.use.restore();
};

exports['when existing audit record is deleted, append delete to history'] = function(test) {
  var docid = 123;
  var user1 = 'admin';
  var user2 = 'hacker';
  test.expect(10);
  sinon.stub(db, 'use').returns({
    getView: function(appname, viewname, query, callback) {
      callback(null, {"rows":[{
        _id: docid,
        history: [{
          user: user1,
          action: 'create',
          timestamp: '1Z'
        }]
      }]});
    },
    saveDoc: function(doc, callback) {
      test.equal(doc._id, docid, 'doc has correct id');
      test.equal(doc.history.length, 2, 'history has two entries');

      test.equal(doc.history[0].user, user1, 'user recorded correctly');
      test.equal(doc.history[0].action, 'create', 'action is set correctly');
      test.equal(doc.history[0].timestamp, '1Z', 'timestamp is set');

      test.equal(doc.history[1].user, user2, 'user recorded correctly');
      test.equal(doc.history[1].action, 'delete', 'action is set correctly');
      test.ok(doc.history[1].timestamp, 'timestamp is set');

      callback(null, {record_id: docid});
    }
  });
  audit.log(
    {_id: docid, _deleted: true},
    {user: user2},
    function(err, response) {
      test.equal(err, null, 'no error');
      test.equal(response.record_id, docid, 'response is created doc');
    }
  );
  test.done();
  db.use.restore();
};