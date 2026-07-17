const sinon = require('sinon');
const assert = require('chai').assert;

const later = require('later');
const moment = require('moment');

const scheduling = require('../../../src/lib/scheduling');

describe('scheduling', () => {
  describe('getSchedule', () => {
    beforeEach(() => {
      sinon.stub(later.parse, 'text');
      sinon.stub(later.parse, 'cron');
    });

    afterEach(() => sinon.restore());

    it('should return schedule for cron', () => {
      later.parse.cron.returns('parsed cron');
      later.parse.text.returns('parsed text');
      assert.equal(scheduling.getSchedule({ cron: 'something' }), 'parsed cron');
      assert.equal(later.parse.cron.callCount, 1);
      assert.deepEqual(later.parse.cron.args[0], ['something']);
      assert.equal(later.parse.text.callCount, 0);
    });

    it('should return schedule for text_expression', () => {
      later.parse.text.returns('parsed text');
      later.parse.cron.returns('parsed cron');
      assert.equal(scheduling.getSchedule({ text_expression: 'other' }), 'parsed text');
      assert.equal(later.parse.text.callCount, 1);
      assert.deepEqual(later.parse.text.args[0], ['other']);
      assert.equal(later.parse.cron.callCount, 0);
    });

    it('should prioritize text_expression', () => {
      later.parse.text.returns('parsed text');
      later.parse.cron.returns('parsed cron');
      assert.equal(scheduling.getSchedule({ text_expression: 'text', cron: 'cron'}), 'parsed text');
      assert.equal(later.parse.text.callCount, 1);
      assert.deepEqual(later.parse.text.args[0], ['text']);
      assert.equal(later.parse.cron.callCount, 0);
    });
  });

  describe('nextScheduleMillis', () => {

    let clock;

    afterEach(() => clock.restore());

    it('should return the exact milliseconds for next schedule', () => {
      clock = sinon.useFakeTimers({now: moment('2021-06-07T11:59:05').valueOf()});       // 55 sec before 12 o'clock
      const scheduleConfig = later.parse.cron('0 * * * *');                  // Run every hour at minute 0
      assert.equal(scheduling.nextScheduleMillis(scheduleConfig), 55 * 1000);
    });

    it('should return the exact milliseconds for next schedule with less than 1 sec', () => {
      clock = sinon.useFakeTimers({now: moment('2021-06-07T11:59:59.910').valueOf()});   // 90 millis before 12 o'clock
      const scheduleConfig = later.parse.cron('0 12 * * *');                 // Run 12 o'clock
      assert.equal(scheduling.nextScheduleMillis(scheduleConfig), 90);
    });
  });

  describe('parseDuration', () => {
    it('parses "<number> <unit>" expressions into moment durations', () => {
      assert.equal(scheduling.parseDuration('4 hours').asMilliseconds(), 4 * 60 * 60 * 1000);
      assert.equal(scheduling.parseDuration('30 minutes').asMilliseconds(), 30 * 60 * 1000);
      assert.equal(scheduling.parseDuration('1 day').asMilliseconds(), 24 * 60 * 60 * 1000);
      assert.equal(scheduling.parseDuration('10 minute').asMilliseconds(), 10 * 60 * 1000);
      assert.equal(scheduling.parseDuration('2 weeks').asMilliseconds(), 14 * 24 * 60 * 60 * 1000);
      assert.equal(scheduling.parseDuration('  90 seconds  ').asMilliseconds(), 90 * 1000);
      assert.isTrue(moment.isDuration(scheduling.parseDuration('4 hours')));
    });

    it('returns null for missing, malformed, or non-positive durations', () => {
      assert.equal(scheduling.parseDuration(), null);
      assert.equal(scheduling.parseDuration(null), null);
      assert.equal(scheduling.parseDuration(42), null);
      assert.equal(scheduling.parseDuration('forever'), null);
      assert.equal(scheduling.parseDuration('-1 hours'), null);
      assert.equal(scheduling.parseDuration('0 hours'), null);
      assert.equal(scheduling.parseDuration('4 lightyears'), null);
    });
  });
});
