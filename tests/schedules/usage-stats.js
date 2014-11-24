var schedule = require('../../schedules/usage-stats'),
    db = require('../../db'),
    utils = require('../../controllers/utils'),
    sinon = require('sinon');

var clock;

exports.setUp = function(callback) {
  clock = sinon.useFakeTimers();
  callback();
};

var restore = function(fn) {
  if (fn.restore) {
    fn.restore();
  }
};

exports.tearDown = function (callback) {
  clock.restore();
  restore(db.getView);
  restore(db.saveDoc);
  restore(utils.getBirthPatientIds);
  restore(utils.rejectDeliveries);
  restore(utils.getDeliveries);
  restore(utils.getVisits);
  callback();
};

exports['go returns errors from getView'] = function(test) {
  test.expect(2);
  var getView = sinon.stub(db, 'getView').callsArgWith(2, 'bang');
  schedule.go(function(err) {
    test.equals(err, 'bang');
    test.equals(getView.callCount, 1);
    test.done();
  });
};

exports['go does nothing if already run'] = function(test) {
  test.expect(2);
  var getView = sinon.stub(db, 'getView').callsArgWith(2, null, { total_rows: 1 });
  schedule.go(function(err) {
    test.equals(err, undefined);
    test.equals(getView.callCount, 1);
    test.done();
  });
};

exports['go saves a doc with results'] = function(test) {
  test.expect(18);
  var getView = sinon.stub(db, 'getView');

  // check if already run this month
  getView.onCall(0).callsArgWith(2, null, { total_rows: 0 });

  // valid form submissions
  getView.onCall(1).callsArgWith(2, null, { rows: [
    { key: [ 1969, 11, 'R' ], value: 23 },
    { key: [ 1969, 11, 'V' ], value: 5 }
  ] });

  // delivery locations
  getView.onCall(2).callsArgWith(2, null, { rows: [
    { key: [ 1969, 11, 'F' ], value: 12 },
    { key: [ 1969, 11, 'S' ], value: 2 },
    { key: [ 1969, 11, 'NS' ], value: 1 }
  ] });

  // active facilities
  getView.onCall(3).callsArgWith(2, null, { rows: [
    { key: [ 1969, 11, '123' ], value: 52 },
    { key: [ 1969, 11, '456' ], value: 13 },
    { key: [ 1969, 11, '789' ], value: 1 }
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
  var saveDoc = sinon.stub(db, 'saveDoc').callsArgWith(1);

  var expected = {
    type: 'usage_stats',
    generated_date: '1970-01-01T00:00:00.000Z',
    month: 11,
    year: 1969,
    valid_form_submissions: { R: 23, V: 5 },
    delivery_locations: { F: 12, S: 2, NS: 1 },
    active_facilities: 3,
    visits_per_delivery: { '1+': 2, '2+': 1, '3+': 1, '4+': 0 },
    estimated_deliveries: 3
  };
  schedule.go(function(err) {
    test.equals(err, undefined);
    test.equals(getView.callCount, 4);
    test.equals(getView.getCall(0).args[0], 'usage_stats_by_year_month');
    test.deepEqual(getView.getCall(0).args[1], {
      startkey: [1969, 11],
      endkey: [1969, 11, {}]
    });
    test.equals(getView.getCall(1).args[0], 'data_records_valid_by_year_month_and_form');
    test.deepEqual(getView.getCall(1).args[1], {
      group: true,
      startkey: [1969, 11],
      endkey: [1969, 11, {}]
    });
    test.equals(getView.getCall(2).args[0], 'delivery_reports_by_year_month_and_code');
    test.deepEqual(getView.getCall(2).args[1], {
      group: true,
      startkey: [1969, 11],
      endkey: [1969, 11, {}]
    });
    test.equals(getView.getCall(3).args[0], 'data_records_by_year_month_and_facility');
    test.deepEqual(getView.getCall(3).args[1], {
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
    test.equals(saveDoc.callCount, 1);
    test.deepEqual(saveDoc.firstCall.args[0], expected);
    test.done();
  });
};
