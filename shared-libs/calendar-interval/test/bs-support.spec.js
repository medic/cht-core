const { expect } = require('chai');
const moment = require('moment');
const service = require('../src/index');

describe('CalendarInterval with Bikram Sambat', () => {

  describe('getCurrent (BS mode)', () => {
    it('returns 1st to end of current BS month when month start is 1', () => {
      // 2024-04-20 AD is 2081-01-08 BS
      const referenceDate = moment('2024-04-20');
      const interval = service.getCurrent(1, referenceDate, true);
      
      // Baisakh 1, 2081 -> 2024-04-13 AD
      expect(moment(interval.start).format('YYYY-MM-DD')).to.equal('2024-04-13');
      // Baisakh has 31 days. Baisakh 31, 2081 -> 2024-05-13 AD
      expect(moment(interval.end).format('YYYY-MM-DD')).to.equal('2024-05-13');
    });

    it('returns n-th of current BS month when n <= today BS (intervalStartDate > 1)', () => {
      // 2024-04-25 AD is 2081-01-13 BS
      const referenceDate = moment('2024-04-25');
      const interval = service.getCurrent(10, referenceDate, true);
      
      // Start: Baisakh 10, 2081 -> 2024-04-22 AD
      expect(moment(interval.start).format('YYYY-MM-DD')).to.equal('2024-04-22');
      // End: Jestha 9, 2081 -> 2024-05-22 AD
      expect(moment(interval.end).format('YYYY-MM-DD')).to.equal('2024-05-22');
    });

    it('returns n-th of previous BS month when n > today BS (previous interval rollover)', () => {
      // 2024-04-20 AD is 2081-01-08 BS
      const referenceDate = moment('2024-04-20');
      const interval = service.getCurrent(10, referenceDate, true);
      
      // Start: Chaitra 10, 2080 -> 2024-03-23 AD
      expect(moment(interval.start).format('YYYY-MM-DD')).to.equal('2024-03-23');
      // End: Baisakh 9, 2081 -> 2024-04-21 AD
      expect(moment(interval.end).format('YYYY-MM-DD')).to.equal('2024-04-21');
    });

    it('handles BS year transitions correctly (end of year rollover)', () => {
      // 2024-04-12 AD is 2080-12-30 BS (last day of year)
      const referenceDate = moment('2024-04-12');
      const interval = service.getCurrent(1, referenceDate, true);
      
      // Start: Chaitra 1, 2080 -> 2024-03-14 AD
      expect(moment(interval.start).format('YYYY-MM-DD')).to.equal('2024-03-14');
      // End: Chaitra 30, 2080 -> 2024-04-12 AD
      expect(moment(interval.end).format('YYYY-MM-DD')).to.equal('2024-04-12');
    });

    it('handles BS year transitions correctly (cross year boundary with n > 1)', () => {
      // 2024-04-05 AD is 2080-12-23 BS
      const referenceDate = moment('2024-04-05');
      const interval = service.getCurrent(25, referenceDate, true);
      
      // Start: Falgun 25, 2080 -> 2024-03-08 AD
      expect(moment(interval.start).format('YYYY-MM-DD')).to.equal('2024-03-08');
      // End: Chaitra 24, 2080 -> 2024-04-06 AD
      expect(moment(interval.end).format('YYYY-MM-DD')).to.equal('2024-04-06');
      
      // Now let's test a date early in Baisakh
      // 2024-04-15 AD is 2081-01-03 BS
      const referenceDate2 = moment('2024-04-15');
      const interval10 = service.getCurrent(10, referenceDate2, true);
      
      // Start should be Chaitra 10, 2080 -> 2024-03-23 AD
      expect(moment(interval10.start).format('YYYY-MM-DD')).to.equal('2024-03-23');
      // End should be Baisakh 9, 2081 -> 2024-04-21 AD
      expect(moment(interval10.end).format('YYYY-MM-DD')).to.equal('2024-04-21');

      // Now let's test a date late in Chaitra with n <= day to cover month > 12 branch
      // 2024-04-05 AD is 2080-12-23 BS
      const referenceDate3 = moment('2024-04-05');
      const interval10_2 = service.getCurrent(10, referenceDate3, true);
      // Start should be Chaitra 10, 2080 -> 2024-03-23 AD
      expect(moment(interval10_2.start).format('YYYY-MM-DD')).to.equal('2024-03-23');
      // End should be Baisakh 9, 2081 -> 2024-04-21 AD
      expect(moment(interval10_2.end).format('YYYY-MM-DD')).to.equal('2024-04-21');
    });

    it('clamps intervalStartDate to end of month if it exceeds month length', () => {
      // Some BS months have 29 days, some 32. Let's test a month with 30 days.
      // Chaitra 2080 has 30 days.
      // 2024-04-10 AD is 2080-12-28 BS.
      const referenceDate = moment('2024-04-10');
      
      // Requesting start on the 31st should clamp to 30th since Chaitra has 30 days
      const interval = service.getCurrent(31, referenceDate, true);
      
      // Start: Falgun 30, 2080 -> 2024-03-13 AD (Falgun has 30 days)
      expect(moment(interval.start).format('YYYY-MM-DD')).to.equal('2024-03-13');
      // End: Chaitra 30, 2080 -> 2024-04-12 AD
      expect(moment(interval.end).format('YYYY-MM-DD')).to.equal('2024-04-12');
    });
  });

  describe('getPrevious (BS mode)', () => {
    it('returns the previous BS month when month start is 1', () => {
      // 2024-04-20 AD is 2081-01-08 BS
      const referenceDate = moment('2024-04-20');
      const previous = service.getPrevious(1, referenceDate, true);
      
      // Previous month is Chaitra 2080. Start: Chaitra 1, 2080 -> 2024-03-14 AD
      expect(moment(previous.start).format('YYYY-MM-DD')).to.equal('2024-03-14');
      // End: Chaitra 30, 2080 -> 2024-04-12 AD
      expect(moment(previous.end).format('YYYY-MM-DD')).to.equal('2024-04-12');
    });

    it('returns the previous interval across year boundaries', () => {
      // 2024-05-14 AD is 2081-02-01 BS (Jestha 1)
      const referenceDate = moment('2024-05-14');
      const previous = service.getPrevious(1, referenceDate, true);
      
      // Previous month is Baisakh 2081. Start: Baisakh 1, 2081 -> 2024-04-13 AD
      expect(moment(previous.start).format('YYYY-MM-DD')).to.equal('2024-04-13');
      // End: Baisakh 31, 2081 -> 2024-05-13 AD
      expect(moment(previous.end).format('YYYY-MM-DD')).to.equal('2024-05-13');

      // Now get previous of Baisakh 1
      const refBaisakh = moment('2024-04-13');
      const prevOfBaisakh = service.getPrevious(1, refBaisakh, true);
      
      // Previous month is Chaitra 2080. Start: Chaitra 1, 2080 -> 2024-03-14 AD
      expect(moment(prevOfBaisakh.start).format('YYYY-MM-DD')).to.equal('2024-03-14');
    });
  });

  describe('Gregorian fallback behavior (Config OFF)', () => {
    it('returns standard Gregorian interval when useBikramSambat is false', () => {
      // 2024-04-20 AD
      const referenceDate = moment('2024-04-20');
      const interval = service.getCurrent(1, referenceDate, false);
      
      // Start should be 2024-04-01
      expect(moment(interval.start).format('YYYY-MM-DD')).to.equal('2024-04-01');
      // End should be 2024-04-30
      expect(moment(interval.end).format('YYYY-MM-DD')).to.equal('2024-04-30');
    });

    it('returns standard Gregorian previous interval when useBikramSambat is false', () => {
      const referenceDate = moment('2024-04-20');
      const previous = service.getPrevious(1, referenceDate, false);
      
      // Start should be 2024-03-01
      expect(moment(previous.start).format('YYYY-MM-DD')).to.equal('2024-03-01');
      // End should be 2024-03-31
      expect(moment(previous.end).format('YYYY-MM-DD')).to.equal('2024-03-31');
    });
  });

  describe('Timezone boundaries', () => {
    it('generates start and end timestamps safely at start and end of day', () => {
      // 2024-04-20 AD is 2081-01-08 BS
      const referenceDate = moment('2024-04-20T15:00:00Z');
      const interval = service.getCurrent(1, referenceDate, true);
      
      // Baisakh 1, 2081 -> 2024-04-13 AD
      const expectedStart = moment('2024-04-13').startOf('day').valueOf();
      const expectedEnd = moment('2024-05-13').endOf('day').valueOf();
      
      expect(interval.start).to.equal(expectedStart);
      expect(interval.end).to.equal(expectedEnd);
    });
  });

  describe('Edge case coverage for 100% branch coverage', () => {
    it('isEqual missing branches', () => {
      expect(service.isEqual({ start: 1, end: 2 }, { start: 1, end: 3 })).to.be.false;
      expect(service.isEqual({ start: 1, end: 2 }, { start: 2, end: 2 })).to.be.false;
      expect(service.isEqual(null, null)).to.be.false;
    });

    it('getCurrent boolean overload missing coverage', () => {
      const interval = service.getCurrent(1, true); // omitted referenceDate
      expect(interval.start).to.be.a('number');
    });

    it('getPrevious missing coverage', () => {
      const interval = service.getPrevious(1, true); // omitted referenceDate
      expect(interval.start).to.be.a('number');
    });

    it('getInterval missing coverage', () => {
      const interval = service.getInterval(1, moment().valueOf(), true);
      expect(interval.start).to.be.a('number');
    });

    it('handles negative month delta correctly', () => {
      // month < 1 branch coverage check
      const referenceDate = moment('2024-04-13'); // Baisakh 1 (month 1)
      const prev = service.getPrevious(1, referenceDate, true);
      expect(moment(prev.start).format('YYYY-MM-DD')).to.equal('2024-03-14');
    });
  });
});
