var controller = require('../../../controllers/active-pregnancies'),
    db = require('../../../db'),
    config = require('../../../config'),
    sinon = require('sinon').sandbox.create();

exports.setUp = function(callback) {
  sinon.stub(config, 'get').returns({});
  callback();
};

exports.tearDown = function (callback) {
  sinon.restore();
  callback();
};

exports['get returns errors'] = function(test) {
  test.expect(2);
  var fti = sinon.stub(db, 'fti').callsArgWith(2, 'bang');
  controller.get({}, function(err) {
    test.equals(err, 'bang');
    test.equals(fti.callCount, 1);
    test.done();
  });
};

exports['get returns zero if no registrations'] = function(test) {
  test.expect(2);
  var fti = sinon.stub(db, 'fti').callsArgWith(2, null, {
    rows: []
  });
  controller.get({}, function(err, results) {
    test.equals(results.count, 0);
    test.equals(fti.callCount, 1);
    test.done();
  });
};

exports['get returns zero if all registrations have delivered'] = function(test) {
  test.expect(2);
  var fti = sinon.stub(db, 'fti');
  fti.onFirstCall().callsArgWith(2, null, {
    rows: [
      { doc: { patient_id: 1 } },
      { doc: { patient_id: 2 } }
    ]
  });
  fti.onSecondCall().callsArgWith(2, null, {
    rows: [
      { doc: { fields: { patient_id: 1 } } },
      { doc: { fields: { patient_id: 2 } } }
    ]
  });
  controller.get({}, function(err, results) {
    test.equals(results.count, 0);
    test.equals(fti.callCount, 2);
    test.done();
  });
};

exports['get returns number if not all registrations have delivered'] = function(test) {
  test.expect(2);
  var fti = sinon.stub(db, 'fti');
  fti.onFirstCall().callsArgWith(2, null, {
    rows: [
      { doc: { patient_id: 1 } },
      { doc: { patient_id: 2 } },
      { doc: { patient_id: 3 } }
    ]
  });
  fti.onSecondCall().callsArgWith(2, null, {
    rows: [
      { doc: { fields: { patient_id: 1 } } }
    ]
  });
  controller.get({}, function(err, results) {
    test.equals(results.count, 2);
    test.equals(fti.callCount, 2);
    test.done();
  });
};

// Tests issue #984
exports['get ignores duplicate delivery reports'] = function(test) {
  test.expect(2);
  var fti = sinon.stub(db, 'fti');
  fti.onFirstCall().callsArgWith(2, null, {
    rows: [
      { doc: { patient_id: 1 } },
      { doc: { patient_id: 2 } },
      { doc: { patient_id: 3 } }
    ]
  });
  fti.onSecondCall().callsArgWith(2, null, {
    rows: [
      { doc: { fields: { patient_id: 1 } } },
      { doc: { fields: { patient_id: 2 } } },
      { doc: { fields: { patient_id: 1 } } }
    ]
  });
  controller.get({}, function(err, results) {
    test.equals(results.count, 1);
    test.equals(fti.callCount, 2);
    test.done();
  });
};
