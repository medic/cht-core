var controller = require('../../controllers/missed-appointments'),
    db = require('../../db'),
    config = require('../../config'),
    moment = require('moment'),
    sinon = require('sinon');

var clock;

exports.setUp = function(callback) {
  clock = sinon.useFakeTimers();
  sinon.stub(config, 'get').returns({});
  callback();
};

exports.tearDown = function (callback) {
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
            due: moment().subtract(20, 'days').toISOString()
          } ]
        } 
      },
      { 
        doc: { 
          patient_id: 2,
          scheduled_tasks: [ {
            group: 1,
            due: moment().subtract(20, 'days').toISOString()
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
            due: moment().subtract(20, 'days').toISOString()
          } ]
        } 
      },
      { 
        doc: { 
          patient_id: 2,
          scheduled_tasks: [ {
            group: 1,
            due: moment().subtract(20, 'days').toISOString()
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

exports['get ignores registrations with no missed appointments'] = function(test) {
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
            due: moment().subtract(24, 'days').toISOString()
          } ]
        } 
      },
      { 
        doc: { 
          patient_id: 3,
          scheduled_tasks: [ {
            group: 1,
            due: moment().subtract(13, 'days').toISOString()
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

exports['get returns all registrations with missed appointments'] = function(test) {
  test.expect(18);
  var fti = sinon.stub(db, 'fti');
  var today = moment();

  // get registrations
  fti.onCall(0).callsArgWith(2, null, {
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
            due: moment().subtract(20, 'days').toISOString()
          } ]
        } 
      },
      { 
        doc: { 
          patient_id: 2,
          fields: { patient_name: 'sally' },
          form: 'P',
          lmp_date: today.clone().subtract(12, 'weeks').toISOString(),
          contact: { id: 'y' },
          scheduled_tasks: [ {
            group: 1,
            due: moment().subtract(20, 'days').toISOString()
          } ]
        } 
      }
    ]
  });

  // get deliveries
  fti.onCall(1).callsArgWith(2, null, {
    rows: [
      { doc: { fields: { patient_id: 4 } } }
    ]
  });

  // get visits for rejection
  fti.onCall(2).callsArgWith(2, null, {
    rows: [
      { doc: { fields: { patient_id: 5 } } }
    ]
  });

  // get visits for count
  fti.onCall(3).callsArgWith(2, null, {
    rows: [
      { doc: { fields: { patient_id: 1 } } },
      { doc: { fields: { patient_id: 2 } } }
    ]
  });

  // get high risk
  fti.onCall(4).callsArgWith(2, null, {
    rows: [
      { doc: { fields: { patient_id: 1 } } },
      { doc: { fields: { patient_id: 1 } } },
      { doc: { fields: { patient_id: 3 } } }
    ]
  });
  controller.get({}, function(err, results) {
    test.equals(results.length, 2);

    test.equals(results[0].patient_id, 1);
    test.equals(results[0].patient_name, 'sarah');
    test.equals(results[0].contact.id, 'x');
    test.equals(results[0].weeks.number, 12);
    test.equals(results[0].weeks.approximate, true);
    test.equals(results[0].date.toISOString(), today.clone().subtract(20, 'days').toISOString());
    test.equals(results[0].visits, 1);
    test.equals(results[0].high_risk, true);

    test.equals(results[1].patient_id, 2);
    test.equals(results[1].patient_name, 'sally');
    test.equals(results[1].contact.id, 'y');
    test.equals(results[1].weeks.number, 12);
    test.equals(results[1].weeks.approximate, undefined);
    test.equals(results[1].date.toISOString(), today.clone().subtract(20, 'days').toISOString());
    test.equals(results[1].visits, 1);
    test.equals(results[1].high_risk, undefined);

    test.equals(fti.callCount, 5);
    test.done();
  });
};