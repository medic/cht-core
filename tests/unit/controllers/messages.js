var controller = require('../../../controllers/messages'),
    db = require('../../../db'),
    sinon = require('sinon').sandbox.create();

exports.tearDown = function (callback) {
  sinon.restore();
  callback();
};

exports['getMessages returns errors'] = function(test) {
  test.expect(2);
  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, 'bang');
  controller.getMessages(null, function(err) {
    test.equals(err, 'bang');
    test.equals(getView.callCount, 1);
    test.done();
  });
};

exports['getMessages passes limit param value of 100 to view'] = function(test) {
  test.expect(2);
  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: [] });
  controller.getMessages({ limit: 500 }, function() {
    test.equals(getView.callCount, 1);
    // assert query parameters on view call use right limit value
    test.deepEqual({ limit: 500 }, getView.getCall(0).args[2]);
    test.done();
  });
};

exports['getMessages returns 500 error if limit over 100'] = function(test) {
  test.expect(3);
  var getView = sinon.stub(db.medic, 'view');
  controller.getMessages({ limit: 9999 }, function(err) {
    test.equals(err.code, 500);
    test.equals(err.message, 'Limit max is 1000');
    test.equals(getView.callCount, 0);
    test.done();
  });
};

exports['getMessages passes state param'] = function(test) {
  test.expect(4);
  sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: [
    { key: 'yayaya', value: { sending_due_date: 456 } },
    { key: 'pending', value: { sending_due_date: 123 } },
    { key: 'pending', value: { sending_due_date: 789 } }
  ] });
  controller.getMessages({}, function(err, messages) {
    test.ok(!err);
    test.equals(messages.length, 3);
    test.ok(messages[0].sending_due_date <= messages[1].sending_due_date);
    test.ok(messages[1].sending_due_date <= messages[2].sending_due_date);
    test.done();
  });
};

exports['getMessages passes states param'] = function(test) {
  test.expect(3);
  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: [] });
  controller.getMessages({ states: ['happy', 'angry'] }, function(err) {
    console.log(err);
    test.ok(!err);
    test.equals(getView.callCount, 1);
    test.deepEqual(['happy', 'angry'], getView.getCall(0).args[2].keys);
    test.done();
  });
};

exports['getMessages sorts results'] = function(test) {
  test.expect(3);
  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: [] });
  controller.getMessages({ states: ['happy', 'angry'] }, function(err) {
    console.log(err);
    test.ok(!err);
    test.equals(getView.callCount, 1);
    test.deepEqual(['happy', 'angry'], getView.getCall(0).args[2].keys);
    test.done();
  });
};

exports['getMessage returns 404 if view returns empty rows'] = function(test) {
  test.expect(3);
  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, null, {rows: []});
  controller.getMessage('foo', function(err) {
    test.equals(err.code, 404);
    test.equals(err.message, 'Not Found');
    test.equals(getView.callCount, 1);
    test.done();
  });
};

exports['getMessage returns view data'] = function(test) {
  test.expect(3);
  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, null, {rows: [{
    value: {message: 'test'}
  }]});
  controller.getMessage('foo', function(err, results) {
    test.ok(!err);
    test.equals(getView.callCount, 1);
    test.deepEqual({ message: 'test' }, results);
    test.done();
  });
};

exports['updateMessageTaskStates takes a collection of state changes and saves it to docs'] = test => {
  sinon.stub(db.medic, 'view').callsArgWith(3, null, {rows: [
    {id: 'testMessageId1'},
    {id: 'testMessageId2'}]});

  sinon.stub(db.medic, 'fetch').callsArgWith(1, null, {rows: [
    {doc: {
      _id: 'testDoc',
      tasks: [{
        messages: [{
          uuid: 'testMessageId1'
        }]
      }],
      scheduled_tasks: [{
        messages: [{
          uuid: 'testMessageId2'
        }]
      }]
    }}
  ]});

  const bulk = sinon.stub(db.medic, 'bulk').callsArgWith(1, null, []);

  controller.updateMessageTaskStates([
    {
      messageId: 'testMessageId1',
      state: 'testState1',
    },
    {
      messageId: 'testMessageId2',
      state: 'testState2',
      details: 'Just because.'
    }
  ], (err, result) => {
    test.equal(err, null);
    test.deepEqual(result, {success: true});

    const doc = bulk.args[0][0].docs[0];
    test.equal(doc._id, 'testDoc');
    test.equal(doc.tasks[0].state, 'testState1');
    test.equal(doc.scheduled_tasks[0].state, 'testState2');
    test.equal(doc.scheduled_tasks[0].state_details, 'Just because.');

    test.done();
  });
};

exports['updateMessageTaskStates re-applies changes if it errored'] = test => {
  const view = sinon.stub(db.medic, 'view')
  .onFirstCall().callsArgWith(3, null, {rows: [
    {id: 'testMessageId1'},
    {id: 'testMessageId2'}]})
  .onSecondCall().callsArgWith(3, null, {rows: [
    {id: 'testMessageId2'}]});

  sinon.stub(db.medic, 'fetch')
  .onFirstCall().callsArgWith(1, null, {rows: [
    {doc: {
      _id: 'testDoc',
      tasks: [{
        messages: [{
          uuid: 'testMessageId1'
        }]
      }]
    }},
    {doc: {
      _id: 'testDoc2',
      tasks: [{
        messages: [{
          uuid: 'testMessageId2'
        }]
      }]
    }}
  ]})
  .onSecondCall().callsArgWith(1, null, {rows: [
    {doc: {
      _id: 'testDoc2',
      tasks: [{
        messages: [{
          uuid: 'testMessageId2'
        }]
      }]
    }}
  ]});

  const bulk = sinon.stub(db.medic, 'bulk')
  .onFirstCall().callsArgWith(1, null, [
    {id: 'testDoc', ok: true},
    {id: 'testDoc2', error: 'oh no!'}])
  .onSecondCall().callsArgWith(1, null, [
    {id: 'testDoc2', ok: true}]);

  controller.updateMessageTaskStates([
    {
      messageId: 'testMessageId1',
      state: 'testState1',
    },
    {
      messageId: 'testMessageId2',
      state: 'testState2',
      details: 'Just because.'
    }
  ], (err, result) => {
    test.equal(err, null);
    test.deepEqual(result, {success: true});

    test.equal(view.callCount, 2);
    test.deepEqual(view.args[0][2], {keys: ['testMessageId1', 'testMessageId2']});
    test.deepEqual(view.args[1][2], {keys: ['testMessageId2']});

    test.equal(bulk.args[0][0].docs.length, 2);
    test.equal(bulk.args[0][0].docs[0]._id, 'testDoc');
    test.equal(bulk.args[0][0].docs[1]._id, 'testDoc2');
    test.equal(bulk.args[1][0].docs.length, 1);
    test.equal(bulk.args[1][0].docs[0]._id, 'testDoc2');

    test.done();
  });
};
