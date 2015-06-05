var controller = require('../../controllers/delivery-location'),
    db = require('../../db'),
    sinon = require('sinon');

exports.tearDown = function (callback) {
  if (db.medic.view.restore) {
    db.medic.view.restore();
  }
  callback();
};

exports['get returns errors'] = function(test) {
  test.expect(2);
  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, 'bang');
  controller.get({}, function(err) {
    test.equals(err, 'bang');
    test.equals(getView.callCount, 1);
    test.done();
  });
};

exports['get returns zero if no delivery reports'] = function(test) {
  test.expect(7);
  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, null, {
    rows: []
  });
  controller.get({}, function(err, results) {
    test.equals(results[0].key, 'F');
    test.equals(results[0].value, 0);
    test.equals(results[1].key, 'S');
    test.equals(results[1].value, 0);
    test.equals(results[2].key, 'NS');
    test.equals(results[2].value, 0);
    test.equals(getView.callCount, 1);
    test.done();
  });
};

exports['get returns zero if no delivery reports'] = function(test) {
  test.expect(7);
  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, null, {
    rows: [
      { key: [ null, 'F' ], value: 5 },
      { key: [ null, 'NS' ], value: 1 }
    ]
  });
  controller.get({}, function(err, results) {
    test.equals(results[0].key, 'F');
    test.equals(results[0].value, 5);
    test.equals(results[1].key, 'S');
    test.equals(results[1].value, 0);
    test.equals(results[2].key, 'NS');
    test.equals(results[2].value, 1);
    test.equals(getView.callCount, 1);
    test.done();
  });
};
