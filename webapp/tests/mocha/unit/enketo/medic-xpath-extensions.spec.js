const assert = require('chai').assert;
const moment = require('moment');
const { toBik_text } = require('bikram-sambat');
const medicXpathExtensions = require('../../../../src/js/enketo/medic-xpath-extensions');

medicXpathExtensions.init(null, toBik_text, moment);
const func = medicXpathExtensions.func;

describe('medic-xpath-extensions', function () {
  const wrapDate = (date) => {
    return { t: 'str', v: date };
  };

  describe('getTimezoneOffsetAsTime()', function () {
    const getTimeZoneOffset = Date.prototype.getTimezoneOffset;
    afterEach(() => Date.prototype.getTimezoneOffset = getTimeZoneOffset);

    it('returns the time zone offset in hours when given a time zone difference in minutes', function () {
      Date.prototype.getTimezoneOffset = () => -60;
      assert.equal(medicXpathExtensions.getTimezoneOffsetAsTime(new Date()), '+01:00');
    });

    it('returns a negative time zone offset when given a positive time zone difference', function () {
      Date.prototype.getTimezoneOffset = () => 60;
      assert.equal(medicXpathExtensions.getTimezoneOffsetAsTime(new Date()), '-01:00');
    });
  });

  describe('toISOLocalString()', function () {
    const getTimeZoneOffset = Date.prototype.getTimezoneOffset;
    afterEach(() => Date.prototype.getTimezoneOffset = getTimeZoneOffset);

    it('returns the ISO local string consistent with the time zone offset', function () {
      const date = new Date('August 19, 1975 23:15:30 GMT+07:00');
      Date.prototype.getTimezoneOffset = () => -60;
      assert.equal(medicXpathExtensions.toISOLocalString(date), '1975-08-19T17:15:30.000+01:00');
      Date.prototype.getTimezoneOffset = () => 60;
      assert.equal(medicXpathExtensions.toISOLocalString(date), '1975-08-19T15:15:30.000-01:00');
    });
  });

  describe('#difference-in-years', function () {
    const diffInYears = func['cht:difference-in-years'];

    it('Should correctly calculate the difference in years', () => {
      const startDate = moment('2020-01-01');
      const endDate = moment('2024-01-01');
      const result = diffInYears(wrapDate(startDate), wrapDate(endDate));
      assert.equal(result.v, 4); // Expected difference in years between the start and end dates
    });

    it('Should return 0 if start and end dates are the same', () => {
      const startDate = moment('2020-01-01');
      const endDate = moment('2020-01-01');
      const result = diffInYears(wrapDate(startDate), wrapDate(endDate));
      assert.equal(result.v, 0);
    });

    it('Should return 0 if start and end date years are the same, but not the months and/or days.', () => {
      const startDate = moment('2020-01-05');
      const endDate = moment('2020-08-23');
      const result = diffInYears(wrapDate(startDate), wrapDate(endDate));
      assert.equal(result.v, 0);
    });

    it('Should handle leap years correctly', () => {
      const startDate = moment('2020-02-29'); // Leap year
      const endDate = moment('2024-02-29'); // Leap year
      const result = diffInYears(wrapDate(startDate), wrapDate(endDate));
      assert.equal(result.v, 4); // Expected difference in years should be 4 despite leap years
    });

    it('Should handle invalid dates', () => {
      const startDate = moment('2020-01-01');
      const endDate = moment('Invalid Date');
      const result = diffInYears(wrapDate(startDate), wrapDate(endDate));
      assert.equal(result.v, ''); // Expected result for an invalid date
    });

    it('Should handle start date after end date', () => {
      const startDate = moment('2024-01-01');
      const endDate = moment('2020-01-01');
      const result = diffInYears(wrapDate(startDate), wrapDate(endDate));
      assert.equal(result.v, -4); // Expected negative difference as start date is after end date
    });
  });

  describe('#difference-in-months', function () {
    const diffInMonths = func['cht:difference-in-months'];

    [
      ['2015-10-01', '2015-10-01', 0,],
      ['2015-09-01', '2015-10-01', 1,],
      ['2015-09-02', '2015-10-01', 0,],
      ['2015-10-01', '2015-11-01', 1,],
      ['2015-10-02', '2015-11-01', 0,],
      ['2014-10-01', '2015-10-01', 12,],
      ['2014-10-02', '2015-10-01', 11,],
      ['2015-10-01T11:11:11.111', '2014-10-01T11:11:11.111', -12,],
      ['2014-10-01T00:00:00.000', '2015-10-01T00:00:00.000', 12,],
      ['August 19, 1975 00:00:00 GMT', 'August 18, 1976 23:15:30 GMT+07:00', 11],
      ['Sun Sep 25 2005 1:00:00 GMT+0100', 'Sun Oct 25 2005 21:00:00 GMT+2300', 0],
      ['Sun Sep 25 2005 1:00:00 GMT+0100', 'Sun Oct 25 2005 22:00:00 GMT+2200', 1]
    ].forEach(function (example) {
      const d1 = { t: 'str', v: example[0] };
      const d2 = { t: 'str', v: example[1] };
      const expectedDifference = example[2];

      it(`should report difference between ${d1.v} and ${d2.v} as ${expectedDifference}`, function () {
        assert.equal(diffInMonths(d1, d2).v, expectedDifference);
      });
    });

    it('should report difference between date objects', function () {
      const d1 = { t: 'date', v: moment('2015-09-22').toDate() };
      const d2 = { t: 'date', v: moment('2014-09-22').toDate() };

      assert.equal(diffInMonths(d1, d2).v, -12);
    });

    it('should report difference between day counts', function () {
      const num1 = { t: 'num', v: 10 };
      const num2 = { t: 'num', v: 50 };
      const str1 = { t: 'str', v: '10' };
      const str2 = { t: 'str', v: '50' };

      assert.equal(diffInMonths(num1, str2).v, 1);
      assert.equal(diffInMonths(str1, num2).v, 1);
    });

    it('should report difference between element arrays', function () {
      const d1 = { t: 'arr', v: [{ textContent: '2015-09-22' }] };
      const d2 = { t: 'arr', v: [{ textContent: '2014-09-22' }] };

      assert.equal(diffInMonths(d1, d2).v, -12);
    });

    it('should return an empty string when the difference cannot be calculated', function () {
      const invalidStr = { t: 'str', v: 'nonsense' };
      const bool = { t: 'bool', v: true };
      const nonsense = { t: 'nonsense', v: '2015-09-22' };
      const valid = { t: 'str', v: '2015-09-22' };

      assert.equal(diffInMonths(invalidStr, valid).v, '');
      assert.equal(diffInMonths(valid, bool).v, '');
      assert.equal(diffInMonths(nonsense, valid).v, '');
    });
  });

  describe('#difference-in-weeks', function () {
    const diffInWeeks = func['cht:difference-in-weeks'];
    [
      ['2023-09-10', '2023-09-22', 1],
      ['2023-01-05', '2023-10-11', 39],
      ['2023-10-05', '2023-11-01', 3],
      ['2023-02-05', '2023-05-29', 16],
      ['2023-06-10', '2023-06-16', 0]
    ].forEach(([startDate, endDate, expectedDiffInWeeks]) => {
      it('should return the difference in weeks', function () {
        const weeks_remaining = diffInWeeks(wrapDate(startDate), wrapDate(endDate));
        assert.deepStrictEqual(weeks_remaining.v, expectedDiffInWeeks);
      });
    });

    it('Should handle start date after end date', () => {
      const startDate = moment('2024-01-01');
      const endDate = moment('2020-01-01');
      const result = diffInWeeks(wrapDate(startDate), wrapDate(endDate));
      assert.equal(result.v, -208);
    });

    it('Should handle leap years correctly', () => {
      const startDate = moment('2020-02-29');
      const endDate = moment('2024-02-29');
      const result = diffInWeeks(wrapDate(startDate), wrapDate(endDate));
      assert.equal(result.v, 208);
    });
  });

  describe('#difference-in-days', function () {
    const diffInDays = func['cht:difference-in-days'];

    it('should handle cases where end date is before start date and return negative number', function () {
      const result = diffInDays(wrapDate('2023-08-01'), wrapDate('2023-01-01'));
      assert.equal(result.v, -212);
    });

    it('should return an empty string when at least one input is not a valid date', function () {
      const result = diffInDays(wrapDate('2023-01-01'), wrapDate('invalid-date'));
      assert.equal(result.v, '');
    });

    it('should return the difference when valid inputs are provided', function () {
      const result = diffInDays(wrapDate('2023-01-01'), wrapDate('2023-08-01'));
      assert.deepStrictEqual(result.v, 212);
    });

    it('Should handle leap years correctly', () => {
      const startDate = moment('2020-02-29');
      const endDate = moment('2024-02-29');
      const result = diffInDays(wrapDate(startDate), wrapDate(endDate));
      assert.equal(result.v, 1461);
    });
  });

  describe('#to-bikram-sambat()', () => {
    [
      [{ t: 'str', v: '2015-9-2' }, '१६ भदौ २०७२', '१५ भदौ २०७२'],
      [{ t: 'str', v: '1999-12-12' }, '२६ मंसिर २०५६', '२५ मंसिर २०५६'],
      [{ t: 'date', v: new Date('2015-10-01T00:00:00.000') }, '१४ असोज २०७२', '१३ असोज २०७२'],
      [{ t: 'num', v: 11111 }, '२१ जेठ २०५७', '२० जेठ २०५७'],
      [{ t: 'arr', v: [{ textContent: '2014-09-22' }] }, '६ असोज २०७१', '५ असोज २०७१'],
    ].forEach(([date, expected, offsetExpected]) => {
      it(`should format the ${date.t} [${JSON.stringify(date.v)}] according to the Bikram Sambat calendar`, () => {
        // The resolved Bikram Sambat date for input that does not have a time+TZ value will be different in
        // environments where the timezone offset is 12 hours or greater (e.g. `Pacific/Auckland`)
        const offsetHrs = new Date().getTimezoneOffset() / 60;
        const tzDateOffset = offsetHrs <= -12;
        assert.equal(func['to-bikram-sambat'](date).v, tzDateOffset ? offsetExpected : expected);
      });
    });

    [
      { t: 'str', v: '' },
      { t: 'date', v: null },
      { t: 'num', v: NaN },
      { t: 'str', v: 'NaN' },
      { t: 'str', v: 'invalid' },
      { t: 'str', v: '11:11' },
      { t: 'bool', v: true },
      { t: 'num', v: '-1' },
      { t: 'nonsense', v: [{ textContent: '2014-09-22' }] },
      { t: 'arr', v: [{ textContent: 'nonsense' }] },
      { t: 'arr', v: ['2014-09-22'] }
    ].forEach(date => {
      it(`should return an empty string when the date value is [${date.v}]`, () => {
        assert.equal(func['to-bikram-sambat'](date).v, '');
      });
    });
  });

  describe('#add-date()', () => {
    const display = value => value ? value.v : '';

    [
      [
        [{ t: 'num', v: 1 }],
        { t: 'date', v: moment('2015-10-01').toDate() },
        '2016-10-01'
      ],
      [
        [null, { t: 'num', v: 1 }],
        { t: 'date', v: new Date('2015-10-01T00:00') },
        '2015-11-01T00:00'
      ],
      [
        [null, null, { t: 'num', v: 1 }],
        { t: 'date', v: new Date('2015-10-01T00:00') },
        '2015-10-02T00:00'
      ],
      [
        [null, null, null, { t: 'num', v: 1 }],
        { t: 'date', v: new Date('2015-10-01T00:00') },
        '2015-10-01T01:00'
      ],
      [
        [null, null, null, null, { t: 'num', v: 1 }],
        { t: 'date', v: new Date('2015-10-01T00:00') },
        '2015-10-01T00:01'
      ],
      [
        [{ t: 'num', v: 1 }, { t: 'num', v: 1 }, { t: 'num', v: 1 }, { t: 'num', v: 1 }, { t: 'num', v: 1 }],
        { t: 'date', v: new Date('1998-11-30T22:59') },
        '2000-01-01T00:00'
      ],
      [
        [{ t: 'num', v: -1 }],
        { t: 'date', v: moment('2015-10-01').toDate() },
        '2014-10-01'
      ],
      [
        [null, { t: 'num', v: -1 }],
        { t: 'date', v: new Date('2015-01-01T00:00') },
        '2014-12-01T00:00'
      ],
      [
        [null, null, { t: 'num', v: -1 }],
        { t: 'date', v: new Date('2015-10-01T00:00') },
        '2015-09-30T00:00'
      ],
      [
        [null, null, null, { t: 'num', v: -1 }],
        { t: 'date', v: new Date('2015-10-02T00:00') },
        '2015-10-01T23:00'
      ],
      [
        [null, null, null, null, { t: 'num', v: -1 }],
        { t: 'date', v: new Date('2015-01-01T00:00') },
        '2014-12-31T23:59'
      ],
      [
        [{ t: 'num', v: 1 }],
        { t: 'str', v: 'Sept 9 2015 00:00' },
        '2016-09-09T00:00'
      ],
      [
        [{ t: 'num', v: 1 }],
        { t: 'num', v: 11111 },
        '2001-06-03T00:00'
      ],
      [
        [{ t: 'num', v: 1 }],
        { t: 'arr', v: [{ textContent: '2014-09-22' }] },
        '2015-09-22T00:00'
      ],
      [
        [{ t: 'str', v: '111' }, null, { t: 'str', v: '-1' }],
        { t: 'date', v: new Date('2015-10-01T00:00') },
        '2126-09-30T00:00'
      ],
      [
        [{ t: 'arr', v: [{ textContent: '1' }] }],
        { t: 'date', v: moment('2015-10-01').toDate() },
        '2016-10-01'
      ],
      [
        [{ t: 'num', v: 0 }, { t: 'num', v: 0 }, { t: 'num', v: 0 }, { t: 'num', v: 0 }, { t: 'num', v: 0 }],
        { t: 'date', v: moment('2015-10-01').toDate() },
        '2015-10-01'
      ],
      [
        [],
        { t: 'date', v: moment('2015-10-01').toDate() },
        '2015-10-01'
      ]
    ].forEach(([[year, month, day, hour, minute], date, expected]) => {
      const valuesDisplay = `[${display(year)},${display(month)},${display(day)},${display(hour)},${display(minute)}]`;
      it(`should add ${valuesDisplay} to ${date.t} [${JSON.stringify(date.v)}]`, () => {
        assert.deepEqual(func['add-date'](date, year, month, day, hour, minute).v, moment(expected).toDate());
      });
    });

    it(`should throw an error when providing too many number parameters`, () => {
      const date = { t: 'date', v: moment('2015-10-01').toDate() };
      assert.throws(() => func['add-date'](date, 1, 2, 3, 4, 5, 6), 'Too many arguments.');
    });

    [
      { t: 'str', v: '' },
      { t: 'bool', v: 'true' },
      { t: 'str', v: 'invalid' },
      { t: 'date', v: moment('2015-10-01').toDate() },
      { t: 'num', v: 'one' },
      { t: 'num', v: 'NaN' },
      { t: 'num', v: NaN },
      { t: 'arr', v: [{ textContent: '2015-10-01' }] }
    ].forEach(year => {
      it(`should not modify the date when given ${year.t} [${JSON.stringify(year.v)}] as a number parameter`, () => {
        const date = { t: 'date', v: moment('2015-10-01').toDate() };
        assert.deepEqual(func['add-date'](date, year).v, date.v);
      });
    });

    [
      { t: 'str', v: '' },
      { t: 'date', v: null },
      { t: 'num', v: NaN },
      { t: 'str', v: 'NaN' },
      { t: 'str', v: 'invalid' },
      { t: 'str', v: '11:11' },
      { t: 'bool', v: true },
      { t: 'num', v: '-1' },
      { t: 'nonsense', v: [{ textContent: '2014-09-22' }] },
      { t: 'arr', v: [{ textContent: 'nonsense' }] },
      { t: 'arr', v: ['2014-09-22'] },
    ].forEach(date => {
      it(`should return 'Invalid Date' when given ${date.t} [${date.v}] as the date parameter`, () => {
        const year = { t: 'num', v: 1 };
        assert.equal(func['add-date'](date, year).v.toString(), 'Invalid Date');
      });
    });
  });

  describe('#strip-whitespace()', () => {
    const test = func['cht:strip-whitespace'];

    it('should return a string without any white spaces', () => {
      const idNumber = { t: 'arr', v: [{ textContent: ' 65 05\n 28  5125 086 ' }] };
      const result = test(idNumber);
      assert.strictEqual(/\s/.test(result.v), false);
    });
  });

  describe('#validate-luhn()', () => {
    const test = func['cht:validate-luhn'];

    it('should return true for a valid South African ID number', () => {
      const idNumber = { t: 'arr', v: [{ textContent: '6505285125086' }] };
      const result = test(idNumber, 13);
      assert.strictEqual(result.v, true);
    });
    it('should return false for an South African ID number that does not contain 13 digits', () => {
      const idNumber = { t: 'arr', v: [{ textContent: '650528512508' }] };
      const result = test(idNumber, 13);
      assert.strictEqual(result.v, false);
    });
    it('should return false for an invalid South African ID number ', () => {
      const idNumber = { t: 'arr', v: [{ textContent: '6505285125085' }] };
      const result = test(idNumber, 13);
      assert.strictEqual(result.v, false);
    });
    it('should return false for a non-numeric South African ID number', () => {
      const idNumber = { t: 'arr', v: [{ textContent: '650528512a086' }] };
      const result = test(idNumber, 13);
      assert.strictEqual(result.v, false);
    });
    it('should return true for a valid South African ID number with spaces', () => {
      const idNumber = { t: 'arr', v: [{ textContent: '6505  2851  2508 6' }] };
      const result = test(idNumber, 13);
      assert.strictEqual(result.v, true);
    });
    it('should return true for a valid South African ID number with leading/trailing spaces', () => {
      const idNumber = { t: 'arr', v: [{ textContent: '  6505285125086  ' }] };
      const result = test(idNumber, 13);
      assert.strictEqual(result.v, true);
    });

    it('should return true for a valid American Express credit card number', () => {
      const idNumber = { t: 'arr', v: [{ textContent: '371449635398431' }] };
      const result = test(idNumber, 15);
      assert.strictEqual(result.v, true);
    });
    it('should return false for an invalid American Express credit card number', () => {
      const idNumber = { t: 'arr', v: [{ textContent: '371449635398432' }] };
      const result = test(idNumber, 15);
      assert.strictEqual(result.v, false);
    });

    it('should return true for a valid Visa credit card number', () => {
      const idNumber = { t: 'arr', v: [{ textContent: '4532015112830366' }] };
      const result = test(idNumber, 16);
      assert.strictEqual(result.v, true);
    });
    it('should return false for an invalid Visa credit card number', () => {
      const idNumber = { t: 'arr', v: [{ textContent: '4532015112830367' }] };
      const result = test(idNumber, 16);
      assert.strictEqual(result.v, false);
    });

    it('should return true for a valid MasterCard credit card number', () => {
      const idNumber = { t: 'arr', v: [{ textContent: '5555555555554444' }] };
      const result = test(idNumber, 16);
      assert.strictEqual(result.v, true);
    });
    it('should return false for an invalid MasterCard credit card number', () => {
      const idNumber = { t: 'arr', v: [{ textContent: '5555555555554445' }] };
      const result = test(idNumber, 16);
      assert.strictEqual(result.v, false);
    });

    it('should return true for a valid Discover credit card number', () => {
      const idNumber = { t: 'arr', v: [{ textContent: '6011000990139424' }] };
      const result = test(idNumber, 16);
      assert.strictEqual(result.v, true);
    });
    it('should return false for an invalid Discover credit card number', () => {
      const idNumber = { t: 'arr', v: [{ textContent: '6011000990139425' }] };
      const result = test(idNumber, 16);
      assert.strictEqual(result.v, false);
    });

    it('should return true for a valid luhn number without specifying a length', () => {
      const number = { t: 'arr', v: [{ textContent: '6505285125086' }] };
      const result = test(number);
      assert.strictEqual(result.v, true);
    });
    it('should return false for a invalid luhn number without specifying a length', () => {
      const number = { t: 'arr', v: [{ textContent: '6011000990139425' }] };
      const result = test(number);
      assert.strictEqual(result.v, false);
    });
  });
});
