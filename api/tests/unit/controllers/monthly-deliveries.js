var controller = require('../../../controllers/monthly-deliveries'),
    db = require('../../../db-nano'),
    config = require('../../../config'),
    moment = require('moment'),
    sinon = require('sinon').sandbox.create();

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

exports['get returns errors from second fti'] = function(test) {
  test.expect(2);
  var fti = sinon.stub(db, 'fti');
  fti.onFirstCall().callsArgWith(2, null, {
    rows: [
      {
        doc: {
          patient_id: 1,
          form: 'R',
          reported_dated: moment().subtract(60, 'weeks')
        }
      }
    ]
  });
  fti.onSecondCall().callsArgWith(2, 'boom');
  controller.get({}, function(err) {
    test.equals(err, 'boom');
    test.equals(fti.callCount, 2);
    test.done();
  });
};

exports['get returns monthly deliveries count'] = function(test) {
  test.expect(2);
  var fti = sinon.stub(db, 'fti');

  // registrations
  fti.onFirstCall().callsArgWith(2, null, {
    rows: [
      {
        doc: {
          patient_id: 1,
          form: 'R',
          reported_date: moment.utc().subtract(60, 'weeks')
        }
      },
      {
        doc: {
          patient_id: 2,
          form: 'R',
          reported_date: moment.utc().subtract(78, 'weeks')
        }
      },
      {
        doc: {
          patient_id: 3,
          form: 'P',
          lmp_date: moment.utc().subtract(68, 'weeks')
        }
      }
    ]
  });

  // delivery reports
  fti.onSecondCall().callsArgWith(2, null, {
    rows: [
      {
        doc: {
          reported_date: moment.utc().subtract(30, 'weeks'),
          fields: { patient_id: 1 }
        }
      },
      {
        doc: {
          reported_date: moment.utc().subtract(16, 'weeks'),
          fields: { patient_id: 4 }
        }
      }
    ]
  });
  controller.get({}, function(err, results) {
    var expected = [
      { month: 'Jan 1969', count: 0 },
      { month: 'Feb 1969', count: 0 },
      { month: 'Mar 1969', count: 1 }, // delivery report for patient 1
      { month: 'Apr 1969', count: 0 },
      { month: 'May 1969', count: 0 },
      { month: 'Jun 1969', count: 2 }, // estimated date for patient 2 & 3
      { month: 'Jul 1969', count: 0 },
      { month: 'Aug 1969', count: 0 },
      { month: 'Sep 1969', count: 1 }, // delivery report for patient 4
      { month: 'Oct 1969', count: 0 },
      { month: 'Nov 1969', count: 0 },
      { month: 'Dec 1969', count: 0 }
    ];
    test.same(results, expected);
    test.equals(fti.callCount, 2);
    test.done();
  });
};
