var utils = require('../../../controllers/utils'),
    db = require('../../../db'),
    config = require('../../../config'),
    moment = require('moment'),
    testUtils = require('../utils'),
    sinon = require('sinon');

var clock;

exports.setUp = function(callback) {
  clock = sinon.useFakeTimers();
  callback();
};

exports.tearDown = function (callback) {
  testUtils.restore(clock, db.fti, config.get);
  callback();
};

exports['getAllRegistrations generates correct query'] = function(test) {
  test.expect(3);
  sinon.stub(config, 'get').returns({
    registration: 'R',
    registrationLmp: 'P'
  });
  var fti = sinon.stub(db, 'fti').callsArgWith(2, null, 'results');
  var start = moment().subtract(1, 'month').utc();
  var end = moment().utc();
  var expected = 'errors<int>:0 ' +
      'AND form:("R" OR "P") ' +
      'AND expected_date<date>:[' +
        start.clone().add(40, 'weeks').format('YYYY-MM-DD') +
        ' TO ' +
        end.clone().add(40, 'weeks').add(1, 'days').format('YYYY-MM-DD') +
      ']';
  utils.getAllRegistrations({
    startDate: start,
    endDate: end
  }, function(err, results) {
    test.equals(results, 'results');
    test.equals(fti.callCount, 1);
    test.equals(fti.args[0][1].q, expected);
    test.done();
  });
};

exports['getAllRegistrations generates correct query when min and max weeks pregnant provided'] = function(test) {
  test.expect(3);
  sinon.stub(config, 'get').returns({
    registration: 'R',
    registrationLmp: 'P'
  });
  var fti = sinon.stub(db, 'fti').callsArgWith(2, null, 'results');
  var start = moment().add(40, 'weeks').subtract(20, 'weeks').utc().format('YYYY-MM-DD');
  var end = moment().add(40, 'weeks').subtract(10, 'weeks').add(1, 'days').utc().format('YYYY-MM-DD');
  var expected = 'errors<int>:0 ' +
      'AND form:("R" OR "P") ' +
      'AND expected_date<date>:[' + start + ' TO ' + end + ']';
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

exports['getAllRegistrations generates correct query when patientIds provided'] = function(test) {
  test.expect(5);
  sinon.stub(config, 'get').returns({
    registration: 'R',
    registrationLmp: 'P'
  });
  var fti = sinon.stub(db, 'fti').callsArgWith(2, null, { rows: [ 'result' ], total_rows: 1 });
  var start = moment().add(40, 'weeks').subtract(20, 'weeks').utc().format('YYYY-MM-DD');
  var end = moment().add(40, 'weeks').subtract(10, 'weeks').add(1, 'days').utc().format('YYYY-MM-DD');
  var expected = 'errors<int>:0 ' +
      'AND form:("R" OR "P") ' +
      'AND expected_date<date>:[' + start + ' TO ' + end + '] ' +
      'AND patient_id:(1345 OR 532)';
  utils.getAllRegistrations({
    patientIds: ['1345', '532'],
    minWeeksPregnant: 10,
    maxWeeksPregnant: 20
  }, function(err, results) {
    test.equals(results.total_rows, 1);
    test.equals(results.rows.length, 1);
    test.equals(results.rows[0], 'result');
    test.equals(fti.callCount, 1);
    test.equals(fti.args[0][1].q, expected);
    test.done();
  });
};

exports['getAllRegistrations generates multiple queries when over limit'] = function(test) {
  test.expect(6);
  sinon.stub(config, 'get').returns({
    registration: 'R',
    registrationLmp: 'P'
  });
  var fti = sinon.stub(db, 'fti');
  fti.onFirstCall().callsArgWith(2, null, { rows: [ '1', '2', '3' ], total_rows: 3 });
  fti.onSecondCall().callsArgWith(2, null, { rows: [ '4', '5' ], total_rows: 2 });
  var start = moment().add(40, 'weeks').subtract(20, 'weeks').utc().format('YYYY-MM-DD');
  var end = moment().add(40, 'weeks').subtract(10, 'weeks').add(1, 'days').utc().format('YYYY-MM-DD');
  var expected = 'errors<int>:0 ' +
      'AND form:("R" OR "P") ' +
      'AND expected_date<date>:[' + start + ' TO ' + end + ']';
  utils.setup(3);
  utils.getAllRegistrations({
    patientIds: ['3', '1', '2', '5', '4'],
    minWeeksPregnant: 10,
    maxWeeksPregnant: 20
  }, function(err, results) {
    test.equals(results.total_rows, 5);
    test.equals(results.rows.length, 5);
    test.same(results.rows.sort(), ['1', '2', '3', '4', '5']);
    test.equals(fti.callCount, 2);
    test.equals(fti.args[0][1].q, expected + ' AND patient_id:(3 OR 1 OR 2)');
    test.equals(fti.args[1][1].q, expected + ' AND patient_id:(5 OR 4)');
    test.done();
  });
};

exports['describe isDateStrValid'] = function(test) {
  var tests = [
    {
      // reject object type
      val: {},
      res: false
    },
    {
      // reject null type
      val: null,
      res: false
    },
    {
      // reject undefined type
      val: undefined,
      res: false
    },
    {
      // reject array type
      val: [],
      res: false
    },
    {
      // reject empty string
      val: '',
      res: false
    },
    {
      // reject badly formatted string
      val: 'xyz',
      res: false
    },
    {
      // reject badly formatted string
      val: 'Mar, 12 2001',
      res: false
    },
    {
      // reject incomplete string, use strict matching
      val: '2011-10-10',
      res: false
    },
    {
      // reject missing timezone
      val: '2011-10-10T14:48:00',
      res: false
    },
    {
      // rejects timezone with 5 digits
      val: '2011-10-10T14:48:00-00000',
      res: false
    },
    {
      // accepts proper format
      val: '2011-10-10T14:48:00-03',
      res: true
    },
    {
      // accept 4 digit timezone
      val: '2011-10-10T14:48:00-0330',
      res: true
    },
    {
      // accept Z for UTC
      val: '2011-10-10T14:48:00Z',
      res: true
    },
    {
      // accept ms since epoch
      val: '0',
      res: true
    },
    {
      // accept ms since epoch
      val: 0,
      res: true
    },
    {
      // accept ms since epoch
      val: '123',
      res: true
    },
    {
      // accept ms since epoch
      val: 123,
      res: true
    },
    {
      // accept ms since epoch
      val: '1467383343484',
      res: true
    },
    {
      // accept ms since epoch
      val: 1467383343484,
      res: true
    },
    {
      // accept output from native javascript method
      val: new Date().valueOf(),
      res: true
    },
    {
      // accept output from native javascript method
      val: '2016-07-01T14:58:26.336Z',
      res: true
    },
    {
      // accept output from native javascript method
      val: new Date().toISOString(),
      res: true
    }
  ];
  test.expect(test.length);
  tests.forEach(function(t) {
    test.equals(t.res, utils.isDateStrValid(t.val));
  });
  test.done();
};
