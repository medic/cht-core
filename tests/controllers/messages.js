var controller = require('../../controllers/messages'),
    db = require('../../db'),
    sinon = require('sinon');

exports.tearDown = function (callback) {
  if (db.medic.view.restore) {
    db.medic.view.restore();
  }
  if (db.medic.updateWithHandler.restore) {
    db.medic.updateWithHandler.restore();
  }
  if (controller._updateCouchDB.restore) {
    controller._updateCouchDB.restore();
  }
  if (controller.getMessage.restore) {
    controller.getMessage.restore();
  }
  callback();
};

exports['getMessages returns errors'] = function(test) {
  test.expect(2);
  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, 'bang');
  controller.getMessages(null, null, function(err) {
    test.equals(err, 'bang');
    test.equals(getView.callCount, 1);
    test.done();
  });
};

exports['getMessages passes limit param value of 100 to view'] = function(test) {
  test.expect(2);
  var getView = sinon.stub(db.medic, 'view').callsArg(3);
  controller.getMessages({limit: 500}, null, function() {
    test.equals(getView.callCount, 1);
    // assert query parameters on view call use right limit value
    test.deepEqual({limit: 500}, getView.getCall(0).args[2]);
    test.done();
  });
};

exports['getMessages returns 500 error if limit over 100'] = function(test) {
  test.expect(3);
  var getView = sinon.stub(db.medic, 'view');
  controller.getMessages({limit: 9999}, null, function(err) {
    test.equals(err.code, 500);
    test.equals(err.message, 'Limit max is 1000');
    test.equals(getView.callCount, 0);
    test.done();
  });
};

exports['getMessage returns 404 if view returns empty rows'] = function(test) {
  test.expect(3);
  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, null, {rows: []});
  controller.getMessage('foo', null, function(err) {
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
  controller.getMessage('foo', null, function(err, results) {
    test.ok(!err);
    test.equals(getView.callCount, 1);
    test.deepEqual({ message: 'test' }, results);
    test.done();
  });
};

exports['updateMessage returns errors'] = function(test) {
  test.expect(2);
  var get = sinon.stub(controller, 'getMessage').callsArgWith(2, 'boom');
  controller.updateMessage('c38uz32a', null, null, function(err) {
    test.deepEqual(err, 'boom');
    test.equals(get.callCount, 1);
    test.done();
  });
};

/*
 * `_updateCouchDB` should reformat error objects from couchdb/nano to be
 * compatible with this API
 */
exports['_updateCouchDB returns proper errors'] = function(test) {
  test.expect(2);
  var update = sinon.stub(db.medic, 'updateWithHandler').callsArgWith(4, {
    payload: {
      success: false,
      error: 'there was a conflict somehow'
    },
    statusCode: 409,
    headers: {},
    request: {}
  });
  controller._updateCouchDB('c38uz32a', null, function(err) {
    test.deepEqual(err.payload, {
      success: false,
      error: 'there was a conflict somehow'
    });
    test.equals(update.callCount, 1);
    test.done();
  });
};
