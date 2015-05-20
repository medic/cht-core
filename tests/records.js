var controller = require('../controllers/records'),
    db = require('../db-nano'),
    sinon = require('sinon');

exports.tearDown = function (callback) {
  if (db.request.restore) {
    db.request.restore();
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
      from: "+123",
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
