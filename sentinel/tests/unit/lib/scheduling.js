const sinon = require('sinon');
const assert = require('chai').assert;
const later = require('later');

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
});
