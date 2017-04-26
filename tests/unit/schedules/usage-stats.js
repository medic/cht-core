var schedule = require('../../../schedules/usage-stats'),
    db = require('../../../db'),
    utils = require('../../../controllers/utils'),
    sinon = require('sinon').sandbox.create();

var clock;

exports.setUp = function(callback) {
  clock = sinon.useFakeTimers();
  callback();
};

exports.tearDown = function (callback) {
  sinon.restore();
  callback();
};

exports['go returns errors from view'] = function(test) {
  test.expect(2);
  var view = sinon.stub(db.medic, 'view').callsArgWith(3, 'bang');
  schedule.go(function(err) {
    test.equals(err, 'bang');
    test.equals(view.callCount, 1);
    test.done();
  });
};

exports['go does nothing if already run'] = function(test) {
  test.expect(2);
  var view = sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: [ { year: 2015 } ] });
  schedule.go(function(err) {
    test.equals(err, undefined);
    test.equals(view.callCount, 1);
    test.done();
  });
};

exports['go saves a doc with results'] = function(test) {
  test.expect(18);
  var view = sinon.stub(db.medic, 'view');

  // check if already run this month
  view.onCall(0).callsArgWith(3, null, { rows: [] });

  // valid form submissions
  view.onCall(1).callsArgWith(3, null, { rows: [
    { key: [ 1969, 11, null ], value: 5 },
    { key: [ 1969, 11, 'R' ], value: 23 },
    { key: [ 1969, 11, 'V' ], value: 5 }
  ] });

  // delivery locations
  view.onCall(2).callsArgWith(3, null, { rows: [
    { key: [ 1969, 11, 'F' ], value: 12 },
    { key: [ 1969, 11, 'S' ], value: 2 },
    { key: [ 1969, 11, 'NS' ], value: 1 }
  ] });

  // active facilities
  view.onCall(3).callsArgWith(3, null, { rows: [
    { key: [ 1969, 11, 'R', 'a' ], value: 10 },
    { key: [ 1969, 11, 'V', 'a' ], value: 12 },
    { key: [ 1969, 11, null, 'a' ], value: 1 },
    { key: [ 1969, 11, 'V', 'b' ], value: 2 },
    { key: [ 1969, 11, 'R', 'b' ], value: 8 },
    { key: [ 1969, 11, 'V', 'c' ], value: 2 },
    { key: [ 1969, 11, null, 'c' ], value: 2 },
    { key: [ 1969, 11, null, 'd' ], value: 1 },
    { key: [ 1969, 11, null, 'e' ], value: 1 }
  ] });

  // estimated deliveries
  var getAllRegistrations = sinon.stub(utils, 'getAllRegistrations').callsArgWith(1, null, { rows: [
    { doc: { patient_id: 1 } },
    { doc: { patient_id: 2 } },
    { doc: { patient_id: 3 } }
  ] });
  var rejectDeliveries = sinon.stub(utils, 'rejectDeliveries').callsArgWith(1, null, [
    { patient_id: 2 },
    { patient_id: 3 }
  ]);
  var getDeliveries = sinon.stub(utils, 'getDeliveries').callsArgWith(1, null, { rows: [
    { doc: { patient_id: 4 } }
  ] });
  var getVisits = sinon.stub(utils, 'getVisits').callsArgWith(1, null, { rows: [
    { doc: { patient_id: 4 } },
    { doc: { patient_id: 4 } },
    { doc: { patient_id: 2 } },
    { doc: { patient_id: 4 } }
  ] });

  // persisting
  var insert = sinon.stub(db.medic, 'insert').callsArgWith(1);

  var expected = {
    type: 'usage_stats',
    version: 2,
    reported_date: 0,
    month: 11,
    year: 1969,
    valid_form_submissions: { _totalReports: 28, _totalMessages: 5, R: 23, V: 5 },
    delivery_locations: { F: 12, S: 2, NS: 1 },
    active_facilities: { _total: 5, _totalReports: 3, _totalMessages: 4, R: 2, V: 3 },
    visits_per_delivery: { '1+': 2, '2+': 1, '3+': 1, '4+': 0 },
    estimated_deliveries: 3
  };
  schedule.go(function(err) {
    test.equals(err, undefined);
    test.equals(view.callCount, 4);
    test.equals(view.getCall(0).args[1], 'usage_stats_by_year_month');
    test.deepEqual(view.getCall(0).args[2], {
      startkey: [1969, 11],
      endkey: [1969, 11, {}]
    });
    test.equals(view.getCall(1).args[1], 'data_records_by_year_month_form_place');
    test.deepEqual(view.getCall(1).args[2], {
      group: true,
      group_level: 3,
      startkey: [1969, 11],
      endkey: [1969, 11, {}]
    });
    test.equals(view.getCall(2).args[1], 'delivery_reports_by_year_month_and_code');
    test.deepEqual(view.getCall(2).args[2], {
      group: true,
      startkey: [1969, 11],
      endkey: [1969, 11, {}]
    });
    test.equals(view.getCall(3).args[1], 'data_records_by_year_month_form_place');
    test.deepEqual(view.getCall(3).args[2], {
      group: true,
      startkey: [1969, 11],
      endkey: [1969, 11, {}]
    });
    test.equals(getAllRegistrations.callCount, 1);
    test.equals(rejectDeliveries.callCount, 1);
    test.deepEqual(rejectDeliveries.getCall(0).args[0], [
      { patient_id: 1 }, { patient_id: 2 }, { patient_id: 3 }
    ]);
    test.equals(getDeliveries.callCount, 1);
    test.equals(getVisits.callCount, 1);
    test.deepEqual(getVisits.getCall(0).args[0], { patientIds: [ 4, 2, 3 ] });
    test.equals(insert.callCount, 1);
    test.deepEqual(insert.firstCall.args[0], expected);
    test.done();
  });
};
