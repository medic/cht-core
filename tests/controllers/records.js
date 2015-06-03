var controller = require('../../controllers/records'),
    db = require('../../db'),
    sinon = require('sinon');

exports.tearDown = function (callback) {
  if (db.request.restore) {
    db.request.restore();
  }
  if (db.getPath.restore) {
    db.getPath.restore();
  }
  callback();
};

exports['createRecord returns formated error from string'] = function(test) {
  test.expect(2);
  var req = sinon.stub(db, 'request').callsArgWith(1, 'icky');
  controller.createRecord({
    message: 'test',
    from: '+123'
  }, null, function(err, results) {
    test.equals(err, 'icky');
    test.equals(req.callCount, 1);
    test.done();
  });
};

exports['createRecordJSON returns formated error from string'] = function(test) {
  test.expect(2);
  var req = sinon.stub(db, 'request').callsArgWith(1, 'icky');
  var body = {
    _meta: {
      from: '+123',
      form: 'A'
    }
  };
  controller.createRecordJSON(body, null, function(err, results) {
    test.equals(err, 'icky');
    test.equals(req.callCount, 1);
    test.done();
  });
};

exports['createRecordJSON returns error if missing _meta property'] = function(test) {
  test.expect(2);
  var req = sinon.stub(db, 'request');
  var body = { name: 'bob' };
  controller.createRecordJSON(body, null, function(err, results) {
    test.equal(err.message, 'Missing _meta property.');
    // request should never be called if validation does not 
    test.equals(req.callCount, 0);
    test.done();
  });
};

exports['createRecordJSON does not call request if validation fails'] = function(test) {
  test.expect(1);
  var req = sinon.stub(db, 'request');
  var body = {};
  controller.createRecordJSON(body, null, function(err, results) {
    test.equals(req.callCount, 0);
    test.done();
  });
};

exports['createRecord does not call request if validation fails'] = function(test) {
  test.expect(1);
  var req = sinon.stub(db, 'request');
  var body = {};
  controller.createRecord(body, null, function(err, results) {
    test.equals(req.callCount, 0);
    test.done();
  });
};

exports['createRecord returns success'] = function(test) {
  test.expect(11);
  var req = sinon.stub(db, 'request').callsArgWith(1, null, { payload: { success: true, id: 5 }});
  var getPath = sinon.stub(db, 'getPath').returns('medic');
  controller.createRecord({
    message: 'test',
    from: '+123',
    unwanted: ';-- DROP TABLE users'
  }, null, function(err, results) {
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

exports['createRecordJSON returns success'] = function(test) {
  test.expect(10);
  var req = sinon.stub(db, 'request').callsArgWith(1, null, { payload: { success: true, id: 5 }});
  var getPath = sinon.stub(db, 'getPath').returns('medic');
  controller.createRecordJSON({
    _meta: {
      form: 'test',
      from: '+123',
      unwanted: ';-- DROP TABLE users'
    }
  }, null, function(err, results) {
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