var nootils = require('../../../static/js/modules/nootils')({});

exports['addDate adds days to the date'] = function(test) {
  var date = new Date('2017-01-01');
  var actual = nootils.addDate(date, 2);
  test.equal(actual.toISOString(), '2017-01-03T00:00:00.000Z');
  test.done();
};

exports['addDate date defaults to now'] = function(test) {
  var actual = nootils.addDate(null, 2);
  var expected = new Date();
  expected.setDate(expected.getDate() + 2);
  test.equal(actual.getDate(), expected.getUTCDate());
  test.done();
};

exports['addDate returns the start of the day'] = function(test) {
  var date = new Date('2017-01-01T16:32:12.555');
  var actual = nootils.addDate(date, 4);
  test.equal(actual.toISOString(), '2017-01-05T00:00:00.000Z');
  test.done();
};

exports['getLmpDate subtracts given weeks off reported date'] = function(test) {
  var date = new Date('2017-01-30');
  var doc = {
    reported_date: date.valueOf(),
    fields: { last_menstrual_period: 3 }
  };
  var actual = nootils.getLmpDate(doc);
  test.equal(actual.toISOString(), '2017-01-09T00:00:00.000Z');
  test.done();
};

exports['getLmpDate defaults to 4 weeks'] = function(test) {
  var date = new Date('2017-01-30');
  var doc = {
    reported_date: date.valueOf(),
    fields: { }
  };
  var actual = nootils.getLmpDate(doc);
  test.equal(actual.toISOString(), '2017-01-02T00:00:00.000Z');
  test.done();
};

exports['getLmpDate returns the start of the day'] = function(test) {
  var date = new Date('2017-01-30T16:32:12.555');
  var doc = {
    reported_date: date.valueOf(),
    fields: { last_menstrual_period: 3 }
  };
  var actual = nootils.getLmpDate(doc);
  test.equal(actual.toISOString(), '2017-01-09T00:00:00.000Z');
  test.done();
};

exports['isTimely returns false if too early'] = function(test) {
  var date = new Date();
  date.setDate(date.getDate() + 1);
  var event = {
    start: 0,
    end: 2
  };
  var actual = nootils.isTimely(date, event);
  test.equal(actual, false);
  test.done();
};

exports['isTimely returns false if too late'] = function(test) {
  var date = new Date();
  date.setDate(date.getDate() - 3);
  var event = {
    start: 0,
    end: 2
  };
  var actual = nootils.isTimely(date, event);
  test.equal(actual, false);
  test.done();
};

exports['isTimely returns true if just right'] = function(test) {
  var date = new Date();
  date.setDate(date.getDate() - 1);
  var event = {
    start: 0,
    end: 2
  };
  var actual = nootils.isTimely(date, event);
  test.equal(actual, true);
  test.done();
};
