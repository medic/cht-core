const sinon = require('sinon');
const assert = require('chai').assert;
const config = require('../../src/config');

describe('date', () => {
  afterEach(() => {
    sinon.restore();
    // Clean up require cache so date.js can be re-loaded
    delete require.cache[require.resolve('../../src/date')];
  });

  describe('without synthetic date', () => {
    let dateModule;

    beforeEach(() => {
      config.init({
        get: sinon.stub().returns(undefined),
        getAll: sinon.stub().returns({}),
      });
      delete require.cache[require.resolve('../../src/date')];
      dateModule = require('../../src/date');
    });

    it('isSynthetic returns false', () => {
      assert.isFalse(dateModule.isSynthetic());
    });

    it('getDate returns a real date', () => {
      const before = Date.now();
      const result = dateModule.getDate();
      const after = Date.now();
      assert.instanceOf(result, Date);
      assert.isAtLeast(result.getTime(), before);
      assert.isAtMost(result.getTime(), after);
    });

    it('getTimestamp returns current time', () => {
      const before = Date.now();
      const result = dateModule.getTimestamp();
      const after = Date.now();
      assert.isAtLeast(result, before);
      assert.isAtMost(result, after);
    });
  });

  describe('with synthetic date', () => {
    let dateModule;

    beforeEach(() => {
      config.init({
        get: sinon.stub().returns('202301151430'),
        getAll: sinon.stub().returns({}),
      });
      delete require.cache[require.resolve('../../src/date')];
      dateModule = require('../../src/date');
    });

    it('isSynthetic returns true', () => {
      assert.isTrue(dateModule.isSynthetic());
    });

    it('getDate returns the synthetic date', () => {
      const result = dateModule.getDate();
      assert.instanceOf(result, Date);
      assert.equal(result.getFullYear(), 2023);
      assert.equal(result.getMonth(), 0); // January = 0
      assert.equal(result.getDate(), 15);
      assert.equal(result.getHours(), 14);
      assert.equal(result.getMinutes(), 30);
    });

    it('getTimestamp returns adjusted time', () => {
      const result = dateModule.getTimestamp();
      assert.isNumber(result);
      // The synthetic timestamp should be offset from now
      // It should be roughly: now - start_date + synth_start_date
      // Just verify it's not the same as Date.now()
      const now = Date.now();
      assert.notEqual(result, now);
    });
  });

  describe('with synthetic date without hours/minutes', () => {
    let dateModule;

    beforeEach(() => {
      config.init({
        get: sinon.stub().returns('20230115'),
        getAll: sinon.stub().returns({}),
      });
      delete require.cache[require.resolve('../../src/date')];
      dateModule = require('../../src/date');
    });

    it('defaults hours to 12 and minutes to 0', () => {
      const result = dateModule.getDate();
      assert.equal(result.getFullYear(), 2023);
      assert.equal(result.getMonth(), 0);
      assert.equal(result.getDate(), 15);
      assert.equal(result.getHours(), 12);
      assert.equal(result.getMinutes(), 0);
    });
  });

  describe('with non-matching synthetic date', () => {
    let dateModule;

    beforeEach(() => {
      config.init({
        get: sinon.stub().returns('not-a-date'),
        getAll: sinon.stub().returns({}),
      });
      delete require.cache[require.resolve('../../src/date')];
      dateModule = require('../../src/date');
    });

    it('isSynthetic returns false when date does not match pattern', () => {
      assert.isFalse(dateModule.isSynthetic());
    });
  });

  describe('getDuration', () => {
    let dateModule;

    beforeEach(() => {
      config.init({
        get: sinon.stub().returns(undefined),
        getAll: sinon.stub().returns({}),
      });
      delete require.cache[require.resolve('../../src/date')];
      dateModule = require('../../src/date');
    });

    it('returns null for invalid input', () => {
      assert.isNull(dateModule.getDuration(''));
      assert.isNull(dateModule.getDuration(null));
      assert.isNull(dateModule.getDuration(undefined));
      assert.isNull(dateModule.getDuration('abc'));
    });

    it('returns duration for valid input', () => {
      const result = dateModule.getDuration('2 days');
      assert.isNotNull(result);
      assert.equal(result.asDays(), 2);
    });
  });
});
