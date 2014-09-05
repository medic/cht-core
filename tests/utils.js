var utils = require('../controllers/utils'),
    db = require('../db'),
    config = require('../config'),
    moment = require('moment'),
    sinon = require('sinon');

var clock;

exports.setUp = function(callback) {
  clock = sinon.useFakeTimers();
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

exports['getAllRegistrations generates correct query'] = function(test) {
  test.expect(3);
  var get = sinon.stub(config, 'get').returns({
    registration: 'R',
    registrationLmp: 'P'
  });
  var fti = sinon.stub(db, 'fti').callsArgWith(2, null, 'results');
  var start = moment().subtract(20, 'weeks').zone(0);
  var end = moment().subtract(10, 'weeks').add(1, 'days').zone(0);
  var rStart = start.format('YYYY-MM-DD');
  var rEnd = end.format('YYYY-MM-DD');
  var pStart = start.subtract(2, 'weeks').format('YYYY-MM-DD');
  var pEnd = end.subtract(2, 'weeks').format('YYYY-MM-DD');
  var expected = 'errors<int>:0 AND ' +
      '((form:R AND reported_date<date>:[' + rStart + ' TO ' + rEnd + ']) OR ' +
      '(form:P AND lmp_date<date>:[' + pStart + ' TO ' + pEnd + ']))';
  utils.getAllRegistrations({
    minWeeksPregnant: 10,
    maxWeeksPregnant: 20
  }, function(err, results) {
    test.equals(results, 'results');
    test.equals(fti.callCount, 1);
    test.equals(fti.args[0][1].q, expected);
    test.done();
  });
};