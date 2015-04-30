var controller = require('../../controllers/messages'),
    db = require('../../db'),
    config = require('../../config'),
    sinon = require('sinon');

exports.tearDown = function (callback) {
  if (db.medic.view.restore) {
    db.medic.view.restore();
  }
  callback();
};

exports['getMessages returns errors'] = function(test) {
  test.expect(2);
  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, 'bang');
  controller.getMessages(null, null, function(err, results) {
    test.equals(err, 'bang');
    test.equals(getView.callCount, 1);
    test.done();
  });
};

exports['getMessages passes limit param value of 100 to view'] = function(test) {
  test.expect(2);
  var getView = sinon.stub(db.medic, 'view').callsArg(3);
  controller.getMessages({limit: 100}, null, function(err, results) {
    test.equals(getView.callCount, 1);
    // assert query parameters on view call use right limit value
    test.deepEqual({limit: 100}, getView.getCall(0).args[2]);
    test.done();
  });
};

exports['getMessages returns 500 error if limit over 100'] = function(test) {
  test.expect(3);
  var getView = sinon.stub(db.medic, 'view');
  controller.getMessages({limit: 101}, null, function(err, results) {
    test.equals(err.code, 500);
    test.equals(err.message, 'Limit max is 100');
    test.equals(getView.callCount, 0);
    test.done();
  });
};

exports['getMessage returns 404 if view returns empty rows'] = function(test) {
  test.expect(3);
  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, null, {rows: []});
  controller.getMessage('foo', null, function(err, results) {
    test.equals(err.code, 404);
    test.equals(err.message, 'Not Found');
    test.equals(getView.callCount, 1);
    test.done();
  });
};

exports['getMessage returns view data'] = function(test) {
  test.expect(3);
  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, null, {rows: [{
    value: {"message": "test"}
  }]});
  controller.getMessage('foo', null, function(err, results) {
    test.ok(!err);
    test.equals(getView.callCount, 1);
    test.deepEqual({"message": "test"}, results);
    test.done();
  });
};
