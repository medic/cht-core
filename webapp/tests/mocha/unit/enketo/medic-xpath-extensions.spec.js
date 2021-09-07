const assert = require('chai').assert;
const medicXpathExtensions = require('../../../../src/js/enketo/medic-xpath-extensions');

const func = medicXpathExtensions.func;

const getTimezoneOffset = Date.prototype.getTimezoneOffset;

describe('medic-xpath-extensions', function() {
  afterEach(done => {
    Date.prototype.getTimezoneOffset = getTimezoneOffset;
    done();
  });

  describe('today()', function() {
    it('returns a result of type `date`', function() {
      assert.equal(func.today().t, 'date');
    });

    it('returns a value which is instance of Date', function() {
      assert.ok(func.today().v instanceof Date);
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
      [ '2015-10-01T00:00:00.000', '2014-10-01T11:11:11.111', -12, ],
    ].forEach(function(example) {
      const d1 = { t:'str', v:example[0] };
      const d2 = { t:'str', v:example[1] };
      const expectedDifference = example[2];

      it('should report difference between ' + d1 + ' and ' + d2 + ' as ' + expectedDifference, function() {
        assert.equal(func['difference-in-months'](d1, d2).v, expectedDifference);
      });
    });

    it('should report difference between date objects', function() {
      const d1 = { t:'date', v:new Date('2015-09-22') };
      const d2 = { t:'date', v:new Date('2014-09-22') };

      assert.equal(func['difference-in-months'](d1, d2).v, -12);
    });

    it('should report difference between day counts', function() {
      const num1 = { t:'num', v:10 };
      const num2 = { t:'num', v:50 };
      const str1 = { t:'str', v:'10' };
      const str2 = { t:'str', v:'50' };

      assert.equal(func['difference-in-months'](num1, str2).v, 1);
      assert.equal(func['difference-in-months'](str1, num2).v, 1);
    });

    it('should report difference between element arrays', function() {
      const d1 = { t:'arr', v:[{ textContent: '2015-09-22' }] };
      const d2 = { t:'arr', v:[{ textContent: '2014-09-22' }] };

      assert.equal(func['difference-in-months'](d1, d2).v, -12);
    });

    it('should return an empty string when the difference cannot be calculated', function() {
      const invalidStr = { t:'str', v:'nonsense' };
      const bool = { t:'bool', v:true };
      const nonsense = { t:'nonsense', v:'2015-09-22' };
      const valid = { t:'str', v:'2015-09-22' };

      assert.equal(func['difference-in-months'](invalidStr, valid).v, '');
      assert.equal(func['difference-in-months'](valid, bool).v, '');
      assert.equal(func['difference-in-months'](nonsense, valid).v, '');
    });
  });
});
