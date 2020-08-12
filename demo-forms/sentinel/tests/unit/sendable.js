const assert = require('chai').assert;
const sinon = require('sinon');

const unit = require('../../src/schedule/index');
const config = require('../../src/config');
const transitionsLib = config.getTransitionsLib();

describe('sendable', () => {

  afterEach(() => sinon.restore());

  const mockConfigGet = ({
    schedule_morning_hours,
    schedule_morning_minutes,
    schedule_evening_hours,
    schedule_evening_minutes
  }) => {
    sinon.stub(config, 'get')
      .withArgs('schedule_morning_hours').returns(schedule_morning_hours)
      .withArgs('schedule_morning_minutes').returns(schedule_morning_minutes)
      .withArgs('schedule_evening_hours').returns(schedule_evening_hours)
      .withArgs('schedule_evening_minutes').returns(schedule_evening_minutes);
  };

  it('config defaults if empty', () => {
    mockConfigGet({});
    const getDate = sinon.stub(transitionsLib.date, 'getDate');

    getDate.returns('2013-01-01T00:00:00.000');
    assert.equal(unit.sendable(), true, '1');

    getDate.returns('2013-01-01T06:00:00.000');
    assert.equal(unit.sendable(), true, '2');

    getDate.returns('2013-01-01T23:00:00.000');
    assert.equal(unit.sendable(), true, '3');
  });

  it('only sendable within configured hours', () => {
    mockConfigGet({
      schedule_morning_hours: 9,
      schedule_evening_hours: 17
    });
    const getDate = sinon.stub(transitionsLib.date, 'getDate');

    getDate.returns('2013-01-01T01:00:00.000');
    assert.equal(unit.sendable(), false, '1');

    getDate.returns('2013-01-01T08:59:59.000');
    assert.equal(unit.sendable(), false, '2');

    getDate.returns('2013-01-01T09:00:00.000');
    assert.equal(unit.sendable(), true, '3');

    getDate.returns('2013-01-01T12:00:00.000');
    assert.equal(unit.sendable(), true, '4');

    getDate.returns('2013-01-01T17:00:00.000');
    assert.equal(unit.sendable(), true, '5');

    getDate.returns('2013-01-01T18:00:00.000');
    assert.equal(unit.sendable(), false, '6');
  });

  it('only sendable within configured hours and minutes', () => {
    mockConfigGet({
      schedule_morning_hours: 9,
      schedule_morning_minutes: 35,
      schedule_evening_hours: 17,
      schedule_evening_minutes: 1
    });
    const getDate = sinon.stub(transitionsLib.date, 'getDate');

    getDate.returns('2013-01-01T01:00:00.000');
    assert.equal(unit.sendable(), false, '1');

    getDate.returns('2013-01-01T09:34:59.000');
    assert.equal(unit.sendable(), false, '2');

    getDate.returns('2013-01-01T09:35:00.000');
    assert.equal(unit.sendable(), true, '3');

    getDate.returns('2013-01-01T12:11:00.000');
    assert.equal(unit.sendable(), true, '4');

    getDate.returns('2013-01-01T17:01:00.000');
    assert.equal(unit.sendable(), true, '5');

    getDate.returns('2013-01-01T17:02:00.000');
    assert.equal(unit.sendable(), false, '6');
  });
});
