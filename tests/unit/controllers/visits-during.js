var controller = require('../../../controllers/visits-during'),
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

exports['get returns errors from getView'] = function(test) {
  test.expect(2);
  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, 'bang');
  controller.get({}, function(err) {
    test.equals(err, 'bang');
    test.equals(getView.callCount, 1);
    test.done();
  });
};

exports['get returns errors from fti'] = function(test) {
  test.expect(3);
  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, null, {
    rows: [
      { key: [ null, '1' ], value: 1 }
    ]
  });
  var fti = sinon.stub(db, 'fti').callsArgWith(2, 'boom');
  controller.get({}, function(err) {
    test.equals(err, 'boom');
    test.equals(getView.callCount, 1);
    test.equals(fti.callCount, 1);
    test.done();
  });
};

exports['get returns errors from second fti'] = function(test) {
  test.expect(3);
  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, null, {
    rows: [
      { key: [ null, '1' ], value: 1 }
    ]
  });
  var fti = sinon.stub(db, 'fti');
  fti.onFirstCall().callsArgWith(2, null, {
    rows: [
      { doc: { patient_id: '1' } },
      { doc: { patient_id: '2' } }
    ]
  });
  fti.onSecondCall().callsArgWith(2, 'bump');
  controller.get({}, function(err) {
    test.equals(err, 'bump');
    test.equals(getView.callCount, 1);
    test.equals(fti.callCount, 2);
    test.done();
  });
};


exports['get returns zero for all counts when no visits'] = function(test) {
  test.expect(2);
  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, null, {
    rows: []
  });
  controller.get({}, function(err, results) {
    test.same(results, [0, 0, 0, 0]);
    test.equals(getView.callCount, 1);
    test.done();
  });
};

exports['get returns zero for all counts when all preganacies are complete'] = function(test) {
  test.expect(3);
  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, null, {
    rows: [
      { key: [ null, '1' ], value: 1 },
      { key: [ null, '2' ], value: 3 }
    ]
  });
  var fti = sinon.stub(db, 'fti').callsArgWith(2, null, {
    rows: [
      { doc: { patient_id: '3' } },
      { doc: { patient_id: '4' } }
    ]
  });
  controller.get({}, function(err, results) {
    test.same(results, [0, 0, 0, 0]);
    test.equals(getView.callCount, 1);
    test.equals(fti.callCount, 1);
    test.done();
  });
};

exports['get returns zero for all counts when all preganacies have delivered'] = function(test) {
  test.expect(3);
  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, null, {
    rows: [
      { key: [ null, '1' ], value: 1 },
      { key: [ null, '2' ], value: 3 }
    ]
  });
  var fti = sinon.stub(db, 'fti');
  fti.onFirstCall().callsArgWith(2, null, {
    rows: [
      { doc: { patient_id: '1' } },
      { doc: { patient_id: '2' } }
    ]
  });
  fti.onSecondCall().callsArgWith(2, null, {
    rows: [
      { doc: { fields: { patient_id: '1' } } },
      { doc: { fields: { patient_id: '2' } } }
    ]
  });
  controller.get({}, function(err, results) {
    test.same(results, [0, 0, 0, 0]);
    test.equals(getView.callCount, 1);
    test.equals(fti.callCount, 2);
    test.done();
  });
};

exports['get returns counts when active preganacies have visits'] = function(test) {
  test.expect(3);
  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, null, {
    rows: [
      { key: [ null, '1' ], value: 1 },
      { key: [ null, '2' ], value: 3 },
      { key: [ null, '3' ], value: 10 },
      { key: [ null, '4' ], value: 3 }
    ]
  });
  var fti = sinon.stub(db, 'fti');
  fti.onFirstCall().callsArgWith(2, null, {
    rows: [
      { doc: { patient_id: '1' } },
      { doc: { patient_id: '3' } },
      { doc: { patient_id: '4' } }
    ]
  });
  fti.onSecondCall().callsArgWith(2, null, {
    rows: [
      { doc: { fields: { patient_id: '4' } } }
    ]
  });
  controller.get({}, function(err, results) {
    test.same(results, [2, 1, 1, 1]);
    test.equals(getView.callCount, 1);
    test.equals(fti.callCount, 2);
    test.done();
  });
};
