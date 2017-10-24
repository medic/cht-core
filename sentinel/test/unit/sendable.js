var moment = require('moment'),
  unit = require('../../schedule/index'),
  settings;

var config = {
  get: function(property) {
    return settings[property];
  }
};

exports['config defaults if empty'] = function(test) {
  settings = {};
  test.equals(unit.sendable(config, moment('2013-01-01T00:00:00.000')), true, '1');
  test.equals(unit.sendable(config, moment('2013-01-01T06:00:00.000')), true, '2');
  test.equals(unit.sendable(config, moment('2013-01-01T23:00:00.000')), true, '3');
  test.done();
};

exports['only sendable within configured hours'] = function(test) {
  settings = {
    schedule_morning_hours: 9,
    schedule_evening_hours: 17
  };
  test.equals(unit.sendable(config, moment('2013-01-01T01:00:00.000')), false, '1');
  test.equals(unit.sendable(config, moment('2013-01-01T08:59:59.000')), false, '2');
  test.equals(unit.sendable(config, moment('2013-01-01T09:00:00.000')), true, '3');
  test.equals(unit.sendable(config, moment('2013-01-01T12:00:00.000')), true, '4');
  test.equals(unit.sendable(config, moment('2013-01-01T17:00:00.000')), true, '5');
  test.equals(unit.sendable(config, moment('2013-01-01T18:00:00.000')), false, '6');
  test.done();
};

exports['only sendable within configured hours and minutes'] = function(test) {
  settings = {
    schedule_morning_hours: 9,
    schedule_morning_minutes: 35,
    schedule_evening_hours: 17,
    schedule_evening_minutes: 1
  };
  test.equals(unit.sendable(config, moment('2013-01-01T01:00:00.000')), false, '1');
  test.equals(unit.sendable(config, moment('2013-01-01T09:34:59.000')), false, '2');
  test.equals(unit.sendable(config, moment('2013-01-01T09:35:00.000')), true, '3');
  test.equals(unit.sendable(config, moment('2013-01-01T12:11:00.000')), true, '4');
  test.equals(unit.sendable(config, moment('2013-01-01T17:01:00.000')), true, '5');
  test.equals(unit.sendable(config, moment('2013-01-01T17:02:00.000')), false, '6');
  test.done();
};