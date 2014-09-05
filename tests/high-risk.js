var controller = require('../controllers/high-risk'),
    db = require('../db'),
    config = require('../config'),
    moment = require('moment'),
    sinon = require('sinon');

var clock;

exports.setUp = function(callback) {
  clock = sinon.useFakeTimers();
  sinon.stub(config, 'get').returns({});
  callback();
};

exports.tearDown = function(callback) {
  clock.restore();
  if (db.fti.restore) {
    db.fti.restore();
  }
  if (config.get.restore) {
    config.get.restore();
  }
  callback();
};

exports['get returns errors'] = function(test) {
  test.expect(2);
  var fti = sinon.stub(db, 'fti').callsArgWith(2, 'bang');
  controller.get({}, function(err, results) {
    test.equals(err, 'bang');
    test.equals(fti.callCount, 1);
    test.done();
  });
};

exports['get returns empty if no registrations'] = function(test) {
  test.expect(2);
  var fti = sinon.stub(db, 'fti').callsArgWith(2, null, {
    rows: []
  });
  controller.get({}, function(err, results) {
    test.equals(results.length, 0);
    test.equals(fti.callCount, 1);
    test.done();
  });
};

exports['get returns empty if all registrations have delivered'] = function(test) {
  test.expect(2);
  var fti = sinon.stub(db, 'fti');
  fti.onFirstCall().callsArgWith(2, null, {
    rows: [
      { 
        doc: { 
          patient_id: 1,
          scheduled_tasks: [ {
            group: 1,
            due: moment().toISOString()
          } ]
        } 
      },
      { 
        doc: { 
          patient_id: 2,
          scheduled_tasks: [ {
            group: 1,
            due: moment().toISOString()
          } ]
        } 
      }
    ]
  });
  fti.onSecondCall().callsArgWith(2, null, {
    rows: [
      { doc: { patient_id: 1 } },
      { doc: { patient_id: 2 } }
    ]
  });
  controller.get({}, function(err, results) {
    test.equals(results.length, 0);
    test.equals(fti.callCount, 2);
    test.done();
  });
};

exports['get returns all high risk pregnancies'] = function(test) {
  test.expect(16);
  var fti = sinon.stub(db, 'fti');
  var today = moment();
  fti.onCall(0).callsArgWith(2, null, {
    rows: [
      { 
        doc: { 
          patient_id: 1,
          patient_name: 'sarah',
          form: 'R',
          reported_date: today.clone().subtract(38, 'weeks').toISOString(),
          related_entities: { clinic: { id: 'x' } }
        } 
      },
      { 
        doc: { 
          patient_id: 2,
          patient_name: 'sally',
          form: 'P',
          lmp_date: today.clone().subtract(42, 'weeks').toISOString(),
          related_entities: { clinic: { id: 'y' } }
        } 
      },
      { 
        doc: { 
          patient_id: 3,
          patient_name: 'sharon',
          form: 'P',
          lmp_date: today.clone().subtract(42, 'weeks').toISOString(),
          related_entities: { clinic: { id: 'y' } }
        } 
      },
      { 
        doc: { 
          patient_id: 4,
          patient_name: 'sharon',
          form: 'P',
          lmp_date: today.clone().subtract(42, 'weeks').toISOString(),
          related_entities: { clinic: { id: 'y' } }
        } 
      }
    ]
  });
  fti.onCall(1).callsArgWith(2, null, {
    rows: [
      { doc: { patient_id: 4 } }
    ]
  });
  fti.onCall(2).callsArgWith(2, null, {
    rows: [
      { doc: { patient_id: 1 } },
      { doc: { patient_id: 3 } }
    ]
  });
  fti.onCall(3).callsArgWith(2, null, {
    rows: [
      { doc: { patient_id: 1 } },
      { doc: { patient_id: 1 } }
    ]
  });
  controller.get({}, function(err, results) {
    test.equals(results.length, 2);

    test.equals(results[0].patient_id, 1);
    test.equals(results[0].patient_name, 'sarah');
    test.equals(results[0].weeks.number, 38);
    test.equals(results[0].weeks.approximate, true);
    test.equals(results[0].clinic.id, 'x');
    test.equals(results[0].visits, 2);
    test.equals(results[0].high_risk, true);

    test.equals(results[1].patient_id, 3);
    test.equals(results[1].patient_name, 'sharon');
    test.equals(results[1].weeks.number, 40);
    test.equals(results[1].weeks.approximate, undefined);
    test.equals(results[1].clinic.id, 'y');
    test.equals(results[1].visits, 0);
    test.equals(results[1].high_risk, true);

    test.equals(fti.callCount, 4);
    test.done();
  });
};