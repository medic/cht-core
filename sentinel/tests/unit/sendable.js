const moment = require('moment');
const assert = require('chai').assert;
const unit = require('../../src/schedule/index');
let settings;

const config = {
  get: function(property) {
    return settings[property];
  }
};

describe('sendable', () => {
  it('config defaults if empty', () => {
    settings = {};
    assert.equal(unit.sendable(config, moment('2013-01-01T00:00:00.000')), true, '1');
    assert.equal(unit.sendable(config, moment('2013-01-01T06:00:00.000')), true, '2');
    assert.equal(unit.sendable(config, moment('2013-01-01T23:00:00.000')), true, '3');
  });

  it('only sendable within configured hours', () => {
    settings = {
      schedule_morning_hours: 9,
      schedule_evening_hours: 17
    };
    assert.equal(unit.sendable(config, moment('2013-01-01T01:00:00.000')), false, '1');
    assert.equal(unit.sendable(config, moment('2013-01-01T08:59:59.000')), false, '2');
    assert.equal(unit.sendable(config, moment('2013-01-01T09:00:00.000')), true, '3');
    assert.equal(unit.sendable(config, moment('2013-01-01T12:00:00.000')), true, '4');
    assert.equal(unit.sendable(config, moment('2013-01-01T17:00:00.000')), true, '5');
    assert.equal(unit.sendable(config, moment('2013-01-01T18:00:00.000')), false, '6');
  });

  it('only sendable within configured hours and minutes', () => {
    settings = {
      schedule_morning_hours: 9,
      schedule_morning_minutes: 35,
      schedule_evening_hours: 17,
      schedule_evening_minutes: 1
    };
    assert.equal(unit.sendable(config, moment('2013-01-01T01:00:00.000')), false, '1');
    assert.equal(unit.sendable(config, moment('2013-01-01T09:34:59.000')), false, '2');
    assert.equal(unit.sendable(config, moment('2013-01-01T09:35:00.000')), true, '3');
    assert.equal(unit.sendable(config, moment('2013-01-01T12:11:00.000')), true, '4');
    assert.equal(unit.sendable(config, moment('2013-01-01T17:01:00.000')), true, '5');
    assert.equal(unit.sendable(config, moment('2013-01-01T17:02:00.000')), false, '6');
  });
});
