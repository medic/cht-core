const sinon = require('sinon');
const { expect } = require('chai');
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
        expect.fail('should have thrown');
      } catch (e) {
        expect(e).to.equal('No arguments provided to "exists" validation function');
      }
    });
  });

  describe('compareDate', () => {
    it('should return false and log error when exception is thrown', () => {
      // Pass invalid arguments that cause an exception in parseDuration
      const result = validationUtils.compareDate({}, null, null, false);
      expect(result).to.be.false;
      expect(logger.error.callCount).to.equal(1);
    });
  });

  describe('isISOWeek', () => {
    it('should return false when week field does not exist', () => {
      const result = validationUtils.isISOWeek({}, 'week', 'year');
      expect(result).to.be.false;
      expect(logger.error.callCount).to.equal(1);
    });

    it('should return false when year field is specified but does not exist', () => {
      const result = validationUtils.isISOWeek({ week: 5 }, 'week', 'year');
      expect(result).to.be.false;
      expect(logger.error.callCount).to.equal(1);
    });

    it('should use current year when no year field specified', () => {
      const result = validationUtils.isISOWeek({ week: 5 }, 'week');
      expect(result).to.be.true;
    });
  });
});
