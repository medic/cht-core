var controller = require('../../../controllers/message-utils'),
    db = require('../../../db'),
    utils = require('../utils'),
    sinon = require('sinon');

exports.tearDown = function (callback) {
  utils.restore(
    db.medic.view,
    db.medic.updateWithHandler,
    controller.getMessage
  );
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

exports['updateMessage returns errors'] = function(test) {
  test.expect(2);
  var get = sinon.stub(controller, 'getMessage').callsArgWith(1, 'boom');
  controller.updateMessage('c38uz32a', null, function(err) {
    test.deepEqual(err, 'boom');
    test.equals(get.callCount, 1);
    test.done();
  });
};
