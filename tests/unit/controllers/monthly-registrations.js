var controller = require('../../../controllers/monthly-registrations'),
    db = require('../../../db'),
    config = require('../../../config'),
    moment = require('moment'),
    utils = require('../utils'),
    sinon = require('sinon');

var clock;

exports.setUp = function(callback) {
  clock = sinon.useFakeTimers();
  sinon.stub(config, 'get').returns({});
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

exports['get returns monthly registrations count'] = function(test) {
  test.expect(2);
  var fti = sinon.stub(db, 'fti').callsArgWith(2, null, {
    rows: [
      { doc: { reported_date: moment().subtract(1, 'months').valueOf() } },
      { doc: { reported_date: moment().subtract(3, 'months').valueOf() } },
      { doc: { reported_date: moment().subtract(1, 'months').valueOf() } }
    ]
  });
  controller.get({}, function(err, results) {
    var expected = [
      { month: 'Jan 1969', count: 0 },
      { month: 'Feb 1969', count: 0 },
      { month: 'Mar 1969', count: 0 },
      { month: 'Apr 1969', count: 0 },
      { month: 'May 1969', count: 0 },
      { month: 'Jun 1969', count: 0 },
      { month: 'Jul 1969', count: 0 },
      { month: 'Aug 1969', count: 0 },
      { month: 'Sep 1969', count: 0 },
      { month: 'Oct 1969', count: 1 },
      { month: 'Nov 1969', count: 0 },
      { month: 'Dec 1969', count: 2 }
    ];
    test.same(results, expected);
    test.equals(fti.callCount, 1);
    test.done();
  });
};
