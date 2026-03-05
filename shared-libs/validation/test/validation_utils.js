const sinon = require('sinon');
const assert = require('chai').assert;
const logger = require('@medic/logger');
const validationUtils = require('../src/validation_utils');

describe('validation_utils', () => {
  beforeEach(() => {
    sinon.stub(logger, 'error');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('exists', () => {
    it('should reject when no fields provided', async () => {
      try {
        await validationUtils.exists({}, [], {});
        assert.fail('should have thrown');
      } catch (e) {
        assert.equal(e, 'No arguments provided to "exists" validation function');
      }
    });
  });

  describe('compareDate', () => {
    it('should return false and log error when exception is thrown', () => {
      // Pass invalid arguments that cause an exception in parseDuration
      const result = validationUtils.compareDate({}, null, null, false);
      assert.isFalse(result);
      assert.equal(logger.error.callCount, 1);
    });
  });

  describe('isISOWeek', () => {
    it('should return false when week field does not exist', () => {
      const result = validationUtils.isISOWeek({}, 'week', 'year');
      assert.isFalse(result);
      assert.equal(logger.error.callCount, 1);
    });

    it('should return false when year field is specified but does not exist', () => {
      const result = validationUtils.isISOWeek({ week: 5 }, 'week', 'year');
      assert.isFalse(result);
      assert.equal(logger.error.callCount, 1);
    });

    it('should use current year when no year field specified', () => {
      const result = validationUtils.isISOWeek({ week: 5 }, 'week');
      assert.isTrue(result);
    });
  });
});
