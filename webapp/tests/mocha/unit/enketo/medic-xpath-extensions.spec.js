const assert = require('chai').assert;
const medicXpathExtensions = require('../../../../src/js/enketo/medic-xpath-extensions');

const func = medicXpathExtensions.func;

const getTimezoneOffset = Date.prototype.getTimezoneOffset;

describe('medic-xpath-extensions', function() {
  afterEach(done => {
    Date.prototype.getTimezoneOffset = getTimezoneOffset;
    done();
  });

  describe('now() and today()', function() {
    it('should have the same implementation', function() {
      assert.equal(func.today, func.now);
      assert.equal(func.now, func.today);
    });
  });

  describe('now()', function() {
    it('returns a result of type `date`', function() {
      assert.equal(func.now().t, 'date');
    });

    it('returns a value which is instance of Date', function() {
      assert.ok(func.now().v instanceof Date);
    });
  });

  describe('getTimezoneOffsetAsTime()', function() {
    it('returns the time zone offset in hours when given a time zone difference in minutes', function() {
      Date.prototype.getTimezoneOffset = () => -60;
      assert.equal(medicXpathExtensions.getTimezoneOffsetAsTime(new Date()), '+01:00');
    });

    it('returns a negative time zone offset when given a positive time zone difference', function() {
      Date.prototype.getTimezoneOffset = () => 60;
      assert.equal(medicXpathExtensions.getTimezoneOffsetAsTime(new Date()), '-01:00');
    });
  });

  describe('toISOLocalString()', function() {
    it('returns the ISO local string consistent with the time zone offset', function() {
      const date = new Date('August 19, 1975 23:15:30 GMT+07:00');
      Date.prototype.getTimezoneOffset = () => -60;
      assert.equal(medicXpathExtensions.toISOLocalString(date), '1975-08-19T17:15:30.000+01:00');
      Date.prototype.getTimezoneOffset = () => 60;
      assert.equal(medicXpathExtensions.toISOLocalString(date), '1975-08-19T15:15:30.000-01:00');
    });
  });

  describe('#difference-in-months', function() {
    [
      [ '2015-10-01', '2015-10-01', 0, ],
      [ '2015-09-01', '2015-10-01', 1, ],
      [ '2015-09-02', '2015-10-01', 0, ],
      [ '2015-10-01', '2015-11-01', 1, ],
      [ '2015-10-02', '2015-11-01', 0, ],
      [ '2014-10-01', '2015-10-01', 12, ],
      [ '2014-10-02', '2015-10-01', 11, ],
      [ '2015-10-01', '2014-10-01', -12, ],
    ].forEach(function(example) {
      const d1 = { t:'str', v:example[0] };
      const d2 = { t:'str', v:example[1] };
      const expectedDifference = example[2];

      it('should report difference between ' + d1 + ' and ' + d2 + ' as ' + expectedDifference, function() {
        assert.equal(func['difference-in-months'](d1, d2).v, expectedDifference);
      });
    });

    it('should return an empty string when the difference cannot be calculated', function() {
      // given
      const d1 = { t:'str', v:'nonsense' };
      const d2 = { t:'str', v:'2015-09-22' };

      // expect
      assert.equal(func['difference-in-months'](d1, d2).v, '');
    });
  });
});
