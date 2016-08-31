var controller = require('../../../controllers/upcoming-appointments'),
    db = require('../../../db'),
    config = require('../../../config'),
    moment = require('moment'),
    utils = require('../utils'),
    sinon = require('sinon');

var clock;

exports.setUp = function(callback) {
  clock = sinon.useFakeTimers();
  sinon.stub(config, 'get').returns({
    flag: 'F',
    visit: 'V',
    registration: 'R',
    registrationLmp: 'P',
    delivery: 'D'
  });
  callback();
};

exports.tearDown = function (callback) {
  utils.restore(clock, db.fti, config.get);
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

exports['get returns zero if all registrations have delivered'] = function(test) {
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
      { doc: { fields: { patient_id: 1 } } },
      { doc: { fields: { patient_id: 2 } } }
    ]
  });
  controller.get({}, function(err, results) {
    test.equals(results.length, 0);
    test.equals(fti.callCount, 2);
    test.done();
  });
};

exports['get returns zero if all registrations have visits'] = function(test) {
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
      { doc: { fields: { patient_id: 1 } } }
    ]
  });
  fti.onThirdCall().callsArgWith(2, null, {
    rows: [
      { doc: { fields: { patient_id: 2 } } }
    ]
  });
  controller.get({}, function(err, results) {
    test.equals(results.length, 0);
    test.equals(fti.callCount, 3);
    test.done();
  });
};

exports['get ignores registrations with no upcoming appointments'] = function(test) {
  test.expect(2);
  var fti = sinon.stub(db, 'fti');
  fti.onFirstCall().callsArgWith(2, null, {
    rows: [
      {
        doc: {
          patient_id: 1,
          scheduled_tasks: []
        }
      },
      {
        doc: {
          patient_id: 2,
          scheduled_tasks: [ {
            group: 1,
            due: moment().subtract(15, 'days').toISOString()
          } ]
        }
      },
      {
        doc: {
          patient_id: 3,
          scheduled_tasks: [ {
            group: 1,
            due: moment().add(6, 'days').toISOString()
          } ]
        }
      }
    ]
  });
  controller.get({}, function(err, results) {
    test.equals(results.length, 0);
    test.equals(fti.callCount, 1);
    test.done();
  });
};

exports['get ignores registrations with upcoming appointment reminders'] = function(test) {
  test.expect(2);
  var fti = sinon.stub(db, 'fti');
  fti.onFirstCall().callsArgWith(2, null, {
    rows: [
      {
        doc: {
          patient_id: 1,
          scheduled_tasks: []
        }
      },
      {
        doc: {
          patient_id: 2,
          scheduled_tasks: [ {
            group: 1,
            due: moment().subtract(15, 'days').toISOString()
          }, {
            group: 1,
            due: moment().toISOString()
          } ]
        }
      },
      {
        doc: {
          patient_id: 3,
          scheduled_tasks: [ {
            group: 1,
            due: moment().add(6, 'days').toISOString()
          } ]
        }
      }
    ]
  });
  controller.get({}, function(err, results) {
    test.equals(results.length, 0);
    test.equals(fti.callCount, 1);
    test.done();
  });
};

exports['get returns all registrations with upcoming appointments'] = function(test) {
  test.expect(18);
  var fti = sinon.stub(db, 'fti');
  var today = moment();
  fti.onFirstCall().callsArgWith(2, null, {
    rows: [
      {
        doc: {
          patient_id: 1,
          fields: { patient_name: 'sarah' },
          form: 'R',
          reported_date: today.clone().subtract(8, 'weeks').toISOString(),
          contact: { id: 'x' },
          scheduled_tasks: [ {
            group: 1,
            due: today.toISOString()
          }, {
            group: 2,
            due: moment().add(4, 'weeks').toISOString()
          } ]
        }
      },
      {
        doc: {
          patient_id: 2,
          fields: { patient_name: 'sally' },
          form: 'P',
          lmp_date: today.clone().subtract(14, 'weeks').toISOString(),
          contact: { id: 'y' },
          scheduled_tasks: [ {
            group: 1,
            due: today.toISOString()
          } ]
        }
      }
    ]
  });
  fti.onSecondCall().callsArgWith(2, null, {
    rows: [
      { doc: { fields: { patient_id: 4 } } }
    ]
  });
  fti.onThirdCall().callsArgWith(2, null, {
    rows: [
      { doc: { fields: { patient_id: 5 } } }
    ]
  });
  fti.onCall(3).callsArgWith(2, null, {
    rows: []
  });
  fti.onCall(4).callsArgWith(2, null, {
    rows: [
      { doc: { fields: { patient_id: 2 } } }
    ]
  });
  controller.get({}, function(err, results) {
    test.equals(results.length, 2);

    test.equals(results[0].patient_id, 1);
    test.equals(results[0].patient_name, 'sarah');
    test.equals(results[0].contact.id, 'x');
    test.equals(results[0].weeks.number, 12);
    test.equals(results[0].weeks.approximate, true);
    test.equals(results[0].date.toISOString(), today.toISOString());
    test.equals(results[0].visits, 0);
    test.equals(results[0].high_risk, undefined);

    test.equals(results[1].patient_id, 2);
    test.equals(results[1].patient_name, 'sally');
    test.equals(results[1].contact.id, 'y');
    test.equals(results[1].weeks.number, 14);
    test.equals(results[1].weeks.approximate, undefined);
    test.equals(results[1].date.toISOString(), today.toISOString());
    test.equals(results[1].visits, 0);
    test.equals(results[1].high_risk, true);

    test.equals(fti.callCount, 5);
    test.done();
  });
};
