var controller = require('../../../controllers/record-utils'),
    db = require('../../../db-nano'),
    sinon = require('sinon').sandbox.create();

exports.tearDown = function (callback) {
  sinon.restore();
  callback();
};

exports['create form returns formated error from string'] = function(test) {
  test.expect(2);
  sinon.stub(db, 'getPath').returns('dummy/path');
  var req = sinon.stub(db, 'request').callsArgWith(1, 'icky');
  controller.createByForm({
    message: 'test',
    from: '+123'
  }, function(err) {
    test.equals(err, 'icky');
    test.equals(req.callCount, 1);
    test.done();
  });
};

// This asserts that we don't rely on any Object properties because req.body doesn't extend Object
exports['create form handles weird pseudo object returned from req.body - #3770'] = function(test) {
  sinon.stub(db, 'getPath').returns('dummy/path');
  var req = sinon.stub(db, 'request').callsArgWith(1, null, { payload: { success: true, id: 5 }});
  var body = Object.create(null);
  body.message = 'test';
  body.from = '+123';
  controller.createByForm(body, function(err) {
    test.equals(err, null);
    test.equals(req.callCount, 1);
    test.done();
  });
};

exports['create form returns error if form value is missing'] = function(test) {
  test.expect(2);
  var req = sinon.stub(db, 'request');
  controller.createByForm({
    message: 'test'
  }, function(err) {
    test.equals(err.message, 'Missing required value: from');
    test.equals(req.callCount, 0);
    test.done();
  });
};

exports['create json returns formated error from string'] = function(test) {
  test.expect(2);
  sinon.stub(db, 'getPath').returns('dummy/path');
  var req = sinon.stub(db, 'request').callsArgWith(1, 'icky');
  var body = {
    _meta: {
      from: '+123',
      form: 'A'
    }
  };
  controller.createRecordByJSON(body, function(err) {
    test.equals(err, 'icky');
    test.equals(req.callCount, 1);
    test.done();
  });
};

exports['create json returns error if missing _meta property'] = function(test) {
  test.expect(2);
  var req = sinon.stub(db, 'request');
  var body = { name: 'bob' };
  controller.createRecordByJSON(body, function(err) {
    test.equal(err.message, 'Missing _meta property.');
    // request should never be called if validation fails
    test.equals(req.callCount, 0);
    test.done();
  });
};

exports['create json does not call request if validation fails'] = function(test) {
  test.expect(1);
  var req = sinon.stub(db, 'request');
  var body = {};
  controller.createRecordByJSON(body, function() {
    test.equals(req.callCount, 0);
    test.done();
  });
};

exports['create form does not call request if validation fails'] = function(test) {
  test.expect(1);
  var req = sinon.stub(db, 'request');
  var body = {};
  controller.createByForm(body, function() {
    test.equals(req.callCount, 0);
    test.done();
  });
};

exports['create form returns success'] = function(test) {
  test.expect(11);
  var req = sinon.stub(db, 'request').callsArgWith(1, null, { payload: { success: true, id: 5 }});
  var getPath = sinon.stub(db, 'getPath').returns('medic');
  controller.createByForm({
    message: 'test',
    from: '+123',
    unwanted: ';-- DROP TABLE users'
  }, function(err, results) {
    test.equals(err, null);
    test.equals(results.success, true);
    test.equals(results.id, 5);
    test.equals(req.callCount, 1);
    test.equals(getPath.callCount, 1);
    var requestOptions = req.firstCall.args[0];
    test.equals(requestOptions.path, 'medic/add');
    test.equals(requestOptions.method, 'POST');
    test.equals(requestOptions.content_type, 'application/x-www-form-urlencoded');
    test.equals(requestOptions.form.message, 'test');
    test.equals(requestOptions.form.from, '+123');
    test.equals(requestOptions.form.unwanted, undefined);
    test.done();
  });
};

exports['create json returns success'] = function(test) {
  test.expect(10);
  var req = sinon.stub(db, 'request').callsArgWith(1, null, { payload: { success: true, id: 5 }});
  var getPath = sinon.stub(db, 'getPath').returns('medic');
  controller.createRecordByJSON({
    _meta: {
      form: 'test',
      from: '+123',
      unwanted: ';-- DROP TABLE users'
    }
  }, function(err, results) {
    test.equals(err, null);
    test.equals(results.success, true);
    test.equals(results.id, 5);
    test.equals(req.callCount, 1);
    test.equals(getPath.callCount, 1);
    var requestOptions = req.firstCall.args[0];
    test.equals(requestOptions.path, 'medic/add');
    test.equals(requestOptions.method, 'POST');
    test.equals(requestOptions.body._meta.form, 'test');
    test.equals(requestOptions.body._meta.from, '+123');
    test.equals(requestOptions.body._meta.unwanted, undefined);
    test.done();
  });
};
