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
      clock = sinon.useFakeTimers(moment('2021-06-07T11:59:05').valueOf());       // 55 sec before 12 o'clock
      const scheduleConfig = later.parse.cron('0 * * * *');                  // Run every hour at minute 0
      assert.equal(scheduling.nextScheduleMillis(scheduleConfig), 55 * 1000);
    });

    it('should return the exact milliseconds for next schedule with less than 1 sec', () => {
      clock = sinon.useFakeTimers(moment('2021-06-07T11:59:59.910').valueOf());   // 90 millis before 12 o'clock
      const scheduleConfig = later.parse.cron('0 12 * * *');                 // Run 12 o'clock
      assert.equal(scheduling.nextScheduleMillis(scheduleConfig), 90);
    });
  });
});
