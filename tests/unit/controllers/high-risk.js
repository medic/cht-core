var controller = require('../../../controllers/high-risk'),
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

exports.tearDown = function(callback) {
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

exports['get returns empty if no flag reports'] = function(test) {
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

exports['get returns empty if no registrations'] = function(test) {
  test.expect(2);
  var fti = sinon.stub(db, 'fti');
  fti.onFirstCall().callsArgWith(2, null, {
    rows: [
      {
        doc: {
          fields: {
            patient_id: 1
          },
          scheduled_tasks: [ {
            group: 1,
            due: moment().toISOString()
          } ]
        }
      },
      {
        doc: {
          fields: {
            patient_id: 2
          },
          scheduled_tasks: [ {
            group: 1,
            due: moment().toISOString()
          } ]
        }
      }
    ]
  });
  fti.onSecondCall().callsArgWith(2, null, {
    rows: []
  });
  controller.get({}, function(err, results) {
    test.equals(results.length, 0);
    test.equals(fti.callCount, 2);
    test.done();
  });
};

/*
 * Tests issue https://github.com/medic/medic-webapp/issues/652
 */
exports['get returns all high risk pregnancies if no deliveries'] = function(test) {
  test.expect(16);
  var fti = sinon.stub(db, 'fti');
  var today = moment();

  // flagged
  fti.onCall(0).callsArgWith(2, null, {
    rows: [
      { doc: { fields: { patient_id: 1 } } },
      { doc: { fields: { patient_id: 3 } } }
    ]
  });
  
  // registrations
  fti.onCall(1).callsArgWith(2, null, {
    rows: [
      {
        doc: {
          patient_id: 1,
          fields: { patient_name: 'sarah' },
          form: 'R',
          reported_date: today.clone().subtract(36, 'weeks').toISOString(),
          contact: { id: 'x' }
        }
      },
      {
        doc: {
          patient_id: 3,
          fields: { patient_name: 'sharon' },
          form: 'P',
          lmp_date: today.clone().subtract(40, 'weeks').toISOString(),
          contact: { id: 'y' }
        }
      }
    ]
  });

  // deliveries
  fti.onCall(2).callsArgWith(2, null, null);

  // visits
  fti.onCall(3).callsArgWith(2, null, {
    rows: [
      { doc: { fields: { patient_id: 1 } } },
      { doc: { fields: { patient_id: 1 } } }
    ]
  });

  controller.get({}, function(err, results) {
    test.equals(results.length, 2);

    test.equals(results[0].patient_id, 1);
    test.equals(results[0].patient_name, 'sarah');
    test.equals(results[0].weeks.number, 40);
    test.equals(results[0].weeks.approximate, true);
    test.equals(results[0].contact.id, 'x');
    test.equals(results[0].visits, 2);
    test.equals(results[0].high_risk, true);

    test.equals(results[1].patient_id, 3);
    test.equals(results[1].patient_name, 'sharon');
    test.equals(results[1].weeks.number, 40);
    test.equals(results[1].weeks.approximate, undefined);
    test.equals(results[1].contact.id, 'y');
    test.equals(results[1].visits, 0);
    test.equals(results[1].high_risk, true);

    test.equals(fti.callCount, 4);
    test.done();
  });
};

exports['get returns all high risk pregnancies'] = function(test) {
  test.expect(21);
  var fti = sinon.stub(db, 'fti');
  var today = moment();
  fti.onCall(0).callsArgWith(2, null, {
    rows: [
      { doc: { fields: { patient_id: 1 } } },
      { doc: { fields: { patient_id: 3 } } },
      { doc: { fields: { patient_id: 4 } } }
    ]
  });
  fti.onCall(1).callsArgWith(2, null, {
    rows: [
      {
        doc: {
          patient_id: 1,
          fields: { patient_name: 'sarah' },
          form: 'R',
          reported_date: today.toISOString(),
          contact: { id: 'x' }
        }
      },
      {
        doc: {
          patient_id: 3,
          fields: { patient_name: 'sharon' },
          form: 'P',
          lmp_date: today.clone().subtract(40, 'weeks').toISOString(),
          contact: { id: 'y' }
        }
      },
      {
        doc: {
          patient_id: 4,
          fields: { patient_name: 'sharon' },
          form: 'P',
          lmp_date: today.clone().subtract(40, 'weeks').toISOString(),
          contact: { id: 'y' }
        }
      }
    ]
  });
  fti.onCall(2).callsArgWith(2, null, {
    rows: [
      { doc: { fields: { patient_id: 4 } } }
    ]
  });
  fti.onCall(3).callsArgWith(2, null, {
    rows: [
      { doc: { fields: { patient_id: 1 } } },
      { doc: { fields: { patient_id: 1 } } }
    ]
  });
  controller.get({}, function(err, results) {
    test.equals(results.length, 2);

    test.equals(fti.callCount, 4);


    // find flagged
    var flaggedStart = moment().subtract(44, 'weeks').utc().format('YYYY-MM-DD');
    test.equals(fti.args[0][1].q, 'errors<int>:0 AND form:F AND reported_date<date>:[' + flaggedStart + ' TO 9999-01-01]');

    // get pregnancies
    var registrationStart = moment().subtract(2, 'weeks').utc().format('YYYY-MM-DD');
    test.equals(fti.args[1][1].q, 'errors<int>:0 AND form:("R" OR "P") AND expected_date<date>:[' + registrationStart + ' TO 1970-10-09] AND patient_id:(1 OR 3 OR 4)');

    // reject deliveries
    test.equals(fti.args[2][1].q, 'form:D AND patient_id:(1 OR 3 OR 4)');

    // inject visits
    test.equals(fti.args[3][1].q, 'form:V AND patient_id:(1 OR 3)');

    test.equals(results[0].patient_id, 1);
    test.equals(results[0].patient_name, 'sarah');
    test.equals(results[0].weeks.number, 4);
    test.equals(results[0].weeks.approximate, true);
    test.equals(results[0].contact.id, 'x');
    test.equals(results[0].visits, 2);
    test.equals(results[0].high_risk, true);

    test.equals(results[1].patient_id, 3);
    test.equals(results[1].patient_name, 'sharon');
    test.equals(results[1].weeks.number, 40);
    test.equals(results[1].weeks.approximate, undefined);
    test.equals(results[1].contact.id, 'y');
    test.equals(results[1].visits, 0);
    test.equals(results[1].high_risk, true);

    test.equals(fti.callCount, 4);
    test.done();
  });
};
