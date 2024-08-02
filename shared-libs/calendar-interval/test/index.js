const sinon = require('sinon');
const chai = require('chai');
const moment = require('moment');

const service = require('../src/index');

describe('CalendarInterval', () => {
  let clock;

  afterEach(() => {
    clock && clock.restore();
    sinon.restore();
  });

  describe('getCurrent', () => {
    it('returns 1st of current month when month start is not set or incorrect', () => {
      clock = sinon.useFakeTimers(moment('2018-01-20 21:10:01').valueOf());
      let expectedStart;
      let expectedEnd;

      expectedStart = moment('2018-01-01 00:00:00').valueOf();
      expectedEnd = moment('2018-01-31 23:59:59:999').valueOf();
      chai.expect(service.getCurrent()).to.deep.equal({ start: expectedStart, end: expectedEnd });
      chai.expect(service.getCurrent(0)).to.deep.equal({ start: expectedStart, end: expectedEnd });
      chai.expect(service.getCurrent(-1)).to.deep.equal({ start: expectedStart, end: expectedEnd });
      chai.expect(service.getCurrent(false)).to.deep.equal({ start: expectedStart, end: expectedEnd });
      chai.expect(service.getCurrent(100)).to.deep.equal({ start: expectedStart, end: expectedEnd });
      chai.expect(service.getCurrent('something')).to.deep.equal({ start: expectedStart, end: expectedEnd });
      clock.restore();

      clock = sinon.useFakeTimers(moment('2018-02-10 21:10:01').valueOf());
      expectedStart = moment('2018-02-01 00:00:00').valueOf();
      expectedEnd = moment('2018-02-28 23:59:59:999').valueOf();
      chai.expect(service.getCurrent()).to.deep.equal({ start: expectedStart, end: expectedEnd });
      chai.expect(service.getCurrent(0)).to.deep.equal({ start: expectedStart, end: expectedEnd });
      chai.expect(service.getCurrent(-10)).to.deep.equal({ start: expectedStart, end: expectedEnd });
      chai.expect(service.getCurrent(false)).to.deep.equal({ start: expectedStart, end: expectedEnd });
      chai.expect(service.getCurrent({})).to.deep.equal({ start: expectedStart, end: expectedEnd });
      chai.expect(service.getCurrent(undefined)).to.deep.equal({ start: expectedStart, end: expectedEnd });
      chai.expect(service.getCurrent([])).to.deep.equal({ start: expectedStart, end: expectedEnd });
      chai.expect(service.getCurrent('something')).to.deep.equal({ start: expectedStart, end: expectedEnd });
    });

    it('returns 1st of current month when month start is 1', () => {
      clock = sinon.useFakeTimers(moment('2018-01-20 21:10:01').valueOf());
      chai.expect(service.getCurrent(1)).to.deep.equal({
        start: moment('2018-01-01 00:00:00').valueOf(),
        end: moment('2018-01-31 23:59:59:999').valueOf()
      });
      clock.restore();

      clock = sinon.useFakeTimers(moment('2018-02-10 21:10:01').valueOf());
      chai.expect(service.getCurrent(1)).to.deep.equal({
        start: moment('2018-02-01 00:00:00').valueOf(),
        end: moment('2018-02-28 23:59:59:999').valueOf(),
      });
      clock.restore();

      clock = sinon.useFakeTimers(moment('2018-03-22 11:10:01').valueOf());
      chai.expect(service.getCurrent(1)).to.deep.equal({
        start: moment('2018-03-01 00:00:00').valueOf(),
        end: moment('2018-03-31 23:59:59:999').valueOf()
      });
      clock.restore();

      clock = sinon.useFakeTimers(moment('2018-12-01 11:10:01').valueOf());
      chai.expect(service.getCurrent(1)).to.deep.equal({
        start: moment('2018-12-01 00:00:00').valueOf(),
        end: moment('2018-12-31 23:59:59:999').valueOf()
      });
    });

    it('returns n-th of the current month when month start is n <= today', () => {
      clock = sinon.useFakeTimers(moment('2018-01-20 21:10:01').valueOf());
      chai.expect(service.getCurrent(10)).to.deep.equal({
        start: moment('2018-01-10 00:00:00').valueOf(),
        end: moment('2018-02-09 23:59:59:999').valueOf()
      });
      clock.restore();

      clock = sinon.useFakeTimers(moment('2018-02-22 21:10:01').valueOf());
      chai.expect(service.getCurrent(6)).to.deep.equal({
        start: moment('2018-02-06 00:00:00').valueOf(),
        end: moment('2018-03-05 23:59:59:999').valueOf()
      });
      clock.restore();

      clock = sinon.useFakeTimers(moment('2018-03-18 11:10:01').valueOf());
      chai.expect(service.getCurrent(18)).to.deep.equal({
        start: moment('2018-03-18 00:00:00').valueOf(),
        end: moment('2018-04-17 23:59:59:999').valueOf()
      });
      clock.restore();

      clock = sinon.useFakeTimers(moment('2018-04-20 11:10:01').valueOf());
      chai.expect(service.getCurrent(20)).to.deep.equal({
        start: moment('2018-04-20 00:00:00').valueOf(),
        end: moment('2018-05-19 23:59:59:999').valueOf()
      });
      clock.restore();

      clock = sinon.useFakeTimers(moment('2018-12-29 11:10:01').valueOf());
      chai.expect(service.getCurrent(9)).to.deep.equal({
        start: moment('2018-12-09 00:00:00').valueOf(),
        end: moment('2019-01-08 23:59:59:999').valueOf()
      });
      clock.restore();

      clock = sinon.useFakeTimers(moment('2018-11-30 11:10:01').valueOf());
      chai.expect(service.getCurrent(30)).to.deep.equal({
        start: moment('2018-11-30 00:00:00').valueOf(),
        end: moment('2018-12-29 23:59:59:999').valueOf()
      });
    });

    it('returns n-th of the previous month when month start is n > today', () => {
      clock = sinon.useFakeTimers(moment('2018-01-04 21:10:01').valueOf());
      chai.expect(service.getCurrent(10)).to.deep.equal({
        start: moment('2017-12-10 00:00:00').valueOf(),
        end: moment('2018-01-09 23:59:59:999').valueOf()
      });
      clock.restore();

      clock = sinon.useFakeTimers(moment('2018-02-6 21:10:01').valueOf());
      chai.expect(service.getCurrent(10)).deep.to.equal({
        start: moment('2018-01-10 00:00:00').valueOf(),
        end: moment('2018-02-09 23:59:59:999').valueOf()
      });
      clock.restore();

      clock = sinon.useFakeTimers(moment('2018-03-18 11:10:01').valueOf());
      chai.expect(service.getCurrent(25)).to.deep.equal({
        start: moment('2018-02-25 00:00:00').valueOf(),
        end: moment('2018-03-24 23:59:59:999').valueOf()
      });
      clock.restore();

      clock = sinon.useFakeTimers(moment('2018-12-05 11:10:01').valueOf());
      chai.expect(service.getCurrent(29)).to.deep.equal({
        start: moment('2018-11-29 00:00:00').valueOf(),
        end: moment('2018-12-28 23:59:59:999').valueOf()
      });
    });

    it('returns first day of current month when start date exceeds previous month day number', () => {
      clock = sinon.useFakeTimers(moment('2016-03-12 16:10:10').valueOf());
      chai.expect(service.getCurrent(31)).to.deep.equal({
        start: moment('2016-03-01 00:00:00').valueOf(),
        end: moment('2016-03-30 23:59:59:999').valueOf()
      });
      chai.expect(service.getCurrent(30)).to.deep.equal({
        start: moment('2016-03-01 00:00:00').valueOf(),
        end: moment('2016-03-29 23:59:59:999').valueOf()
      });
      chai.expect(service.getCurrent(29)).to.deep.equal({
        start: moment('2016-02-29 00:00:00').valueOf(),
        end: moment('2016-03-28 23:59:59:999').valueOf()
      });
      chai.expect(service.getCurrent(28)).to.deep.equal({
        start: moment('2016-02-28 00:00:00').valueOf(),
        end: moment('2016-03-27 23:59:59:999').valueOf()
      });
      clock.restore();

      clock = sinon.useFakeTimers(moment('2017-03-12 02:02:02').valueOf());
      chai.expect(service.getCurrent(31)).to.deep.equal({
        start: moment('2017-03-01 00:00:00').valueOf(),
        end: moment('2017-03-30 23:59:59:999').valueOf()
      });
      chai.expect(service.getCurrent(30)).to.deep.equal({
        start: moment('2017-03-01 00:00:00').valueOf(),
        end: moment('2017-03-29 23:59:59:999').valueOf()
      });
      chai.expect(service.getCurrent(29)).to.deep.equal({
        start: moment('2017-03-01 00:00:00').valueOf(),
        end: moment('2017-03-28 23:59:59:999').valueOf()
      });
      chai.expect(service.getCurrent(28)).to.deep.equal({
        start: moment('2017-02-28 00:00:00').valueOf(),
        end: moment('2017-03-27 23:59:59:999').valueOf()
      });
      chai.expect(service.getCurrent(27)).to.deep.equal({
        start: moment('2017-02-27 00:00:00').valueOf(),
        end: moment('2017-03-26 23:59:59:999').valueOf()
      });
    });

    it('returns last day of current month when start date exceeds current month day number', () => {
      clock = sinon.useFakeTimers(moment('2016-02-12 16:10:10').valueOf());
      chai.expect(service.getCurrent(31)).to.deep.equal({
        start: moment('2016-01-31 00:00:00').valueOf(),
        end: moment('2016-02-29 23:59:59:999').valueOf()
      });
      chai.expect(service.getCurrent(30)).to.deep.equal({
        start: moment('2016-01-30 00:00:00').valueOf(),
        end: moment('2016-02-29 23:59:59:999').valueOf()
      });
      clock.restore();

      clock = sinon.useFakeTimers(moment('2017-02-12 02:02:02').valueOf());
      chai.expect(service.getCurrent(31)).to.deep.equal({
        start: moment('2017-01-31 00:00:00').valueOf(),
        end: moment('2017-02-28 23:59:59:999').valueOf()
      });
      chai.expect(service.getCurrent(30)).to.deep.equal({
        start: moment('2017-01-30 00:00:00').valueOf(),
        end: moment('2017-02-28 23:59:59:999').valueOf()
      });
      chai.expect(service.getCurrent(29)).to.deep.equal({
        start: moment('2017-01-29 00:00:00').valueOf(),
        end: moment('2017-02-28 23:59:59:999').valueOf()
      });
      chai.expect(service.getCurrent(28)).to.deep.equal({
        start: moment('2017-01-28 00:00:00').valueOf(),
        end: moment('2017-02-27 23:59:59:999').valueOf()
      });
      clock.restore();

      clock = sinon.useFakeTimers(moment('2016-01-31 16:10:10').valueOf());
      chai.expect(service.getCurrent(31)).to.deep.equal({
        start: moment('2016-01-31 00:00:00').valueOf(),
        end: moment('2016-02-29 23:59:59:999').valueOf()
      });
      chai.expect(service.getCurrent(30)).to.deep.equal({
        start: moment('2016-01-30 00:00:00').valueOf(),
        end: moment('2016-02-29 23:59:59:999').valueOf()
      });

      chai.expect(service.getCurrent(29)).to.deep.equal({
        start: moment('2016-01-29 00:00:00').valueOf(),
        end: moment('2016-02-28 23:59:59:999').valueOf()
      });
      clock.restore();

      clock = sinon.useFakeTimers(moment('2017-01-31 02:02:02').valueOf());
      chai.expect(service.getCurrent(31)).to.deep.equal({
        start: moment('2017-01-31 00:00:00').valueOf(),
        end: moment('2017-02-28 23:59:59:999').valueOf()
      });
      chai.expect(service.getCurrent(30)).to.deep.equal({
        start: moment('2017-01-30 00:00:00').valueOf(),
        end: moment('2017-02-28 23:59:59:999').valueOf()
      });
      chai.expect(service.getCurrent(29)).to.deep.equal({
        start: moment('2017-01-29 00:00:00').valueOf(),
        end: moment('2017-02-28 23:59:59:999').valueOf()
      });
      chai.expect(service.getCurrent(28)).to.deep.equal({
        start: moment('2017-01-28 00:00:00').valueOf(),
        end: moment('2017-02-27 23:59:59:999').valueOf()
      });
    });
  });

  describe('getPrevious', () => {
    it('returns 1st of previous month when month start is 1', () => {
      clock = sinon.useFakeTimers(moment('2018-02-20 21:10:01').valueOf());
      chai.expect(service.getPrevious(1)).to.deep.equal({
        start: moment('2018-01-01 00:00:00').valueOf(),
        end: moment('2018-01-31 23:59:59:999').valueOf(),
      });
      clock.restore();
    });

    it('returns n-th of the previous month when month start is n <= current date', () => {
      clock = sinon.useFakeTimers(moment('2018-03-20 21:10:01').valueOf());
      chai.expect(service.getPrevious(15)).to.deep.equal({
        start: moment('2018-02-15 00:00:00').valueOf(),
        end: moment('2018-03-14 23:59:59:999').valueOf(),
      });
      clock.restore();
    });

    it('returns n-th of two months ago when month start is n > current date', () => {
      clock = sinon.useFakeTimers(moment('2018-03-10 21:10:01').valueOf());
      chai.expect(service.getPrevious(20)).to.deep.equal({
        start: moment('2018-01-20 00:00:00').valueOf(),
        end: moment('2018-02-19 23:59:59:999').valueOf(),
      });
      clock.restore();
    });
  });

  describe('getInterval', () => {
    it('returns 1st of current month when month start is not set or incorrect', () => {
      let timestamp;
      let expectedStart;
      let expectedEnd;

      timestamp = moment('2018-01-20 21:10:01').valueOf();
      expectedStart = moment('2018-01-01 00:00:00').valueOf();
      expectedEnd = moment('2018-01-31 23:59:59:999').valueOf();
      chai.expect(service.getInterval(undefined, timestamp)).to.deep.equal({ start: expectedStart, end: expectedEnd });
      chai.expect(service.getInterval(0, timestamp)).to.deep.equal({ start: expectedStart, end: expectedEnd });
      chai.expect(service.getInterval(-1, timestamp)).to.deep.equal({ start: expectedStart, end: expectedEnd });
      chai.expect(service.getInterval(false, timestamp)).to.deep.equal({ start: expectedStart, end: expectedEnd });
      chai.expect(service.getInterval(100, timestamp)).to.deep.equal({ start: expectedStart, end: expectedEnd });
      chai.expect(service.getInterval('something', timestamp))
        .to.deep.equal({ start: expectedStart, end: expectedEnd });

      timestamp = moment('2018-02-10 21:10:01').valueOf();
      expectedStart = moment('2018-02-01 00:00:00').valueOf();
      expectedEnd = moment('2018-02-28 23:59:59:999').valueOf();
      chai.expect(service.getInterval(undefined, timestamp)).to.deep.equal({ start: expectedStart, end: expectedEnd });
      chai.expect(service.getInterval(0, timestamp)).to.deep.equal({ start: expectedStart, end: expectedEnd });
      chai.expect(service.getInterval(-10, timestamp)).to.deep.equal({ start: expectedStart, end: expectedEnd });
      chai.expect(service.getInterval(false, timestamp)).to.deep.equal({ start: expectedStart, end: expectedEnd });
      chai.expect(service.getInterval({}, timestamp)).to.deep.equal({ start: expectedStart, end: expectedEnd });
      chai.expect(service.getInterval([], timestamp)).to.deep.equal({ start: expectedStart, end: expectedEnd });
      chai.expect(service.getInterval('something', timestamp))
        .to.deep.equal({ start: expectedStart, end: expectedEnd });
    });

    it('should default to current interval when missing timestamp', () => {
      clock = sinon.useFakeTimers(moment('2018-02-10 21:10:01').valueOf());
      const expectedStart = moment('2018-02-01 00:00:00').valueOf();
      const expectedEnd = moment('2018-02-28 23:59:59:999').valueOf();
      chai.expect(service.getInterval(1)).to.deep.equal({ start: expectedStart, end: expectedEnd });
    });

    it('returns 1st of requested month when month start is 1', () => {
      let timestamp;

      timestamp = moment('2018-01-20 21:10:01').valueOf();
      chai.expect(service.getInterval(1, timestamp)).to.deep.equal({
        start: moment('2018-01-01 00:00:00').valueOf(),
        end: moment('2018-01-31 23:59:59:999').valueOf()
      });

      timestamp = moment('2018-02-10 21:10:01').valueOf();
      chai.expect(service.getInterval(1, timestamp)).to.deep.equal({
        start: moment('2018-02-01 00:00:00').valueOf(),
        end: moment('2018-02-28 23:59:59:999').valueOf(),
      });

      timestamp = moment('2018-03-22 11:10:01').valueOf();
      chai.expect(service.getInterval(1, timestamp)).to.deep.equal({
        start: moment('2018-03-01 00:00:00').valueOf(),
        end: moment('2018-03-31 23:59:59:999').valueOf()
      });

      timestamp = moment('2018-12-01 11:10:01').valueOf();
      chai.expect(service.getInterval(1, timestamp)).to.deep.equal({
        start: moment('2018-12-01 00:00:00').valueOf(),
        end: moment('2018-12-31 23:59:59:999').valueOf()
      });
    });

    it('returns n-th of the month when month start is n <= relative date', () => {
      let timestamp;

      timestamp = moment('2018-01-20 21:10:01').valueOf();
      chai.expect(service.getInterval(10, timestamp)).to.deep.equal({
        start: moment('2018-01-10 00:00:00').valueOf(),
        end: moment('2018-02-09 23:59:59:999').valueOf()
      });

      timestamp = moment('2018-02-22 21:10:01').valueOf();
      chai.expect(service.getInterval(6, timestamp)).to.deep.equal({
        start: moment('2018-02-06 00:00:00').valueOf(),
        end: moment('2018-03-05 23:59:59:999').valueOf()
      });

      timestamp = moment('2018-03-18 11:10:01').valueOf();
      chai.expect(service.getInterval(18, timestamp)).to.deep.equal({
        start: moment('2018-03-18 00:00:00').valueOf(),
        end: moment('2018-04-17 23:59:59:999').valueOf()
      });

      timestamp = moment('2018-04-20 11:10:01').valueOf();
      chai.expect(service.getInterval(20, timestamp)).to.deep.equal({
        start: moment('2018-04-20 00:00:00').valueOf(),
        end: moment('2018-05-19 23:59:59:999').valueOf()
      });

      timestamp = moment('2018-12-29 11:10:01').valueOf();
      chai.expect(service.getInterval(9, timestamp)).to.deep.equal({
        start: moment('2018-12-09 00:00:00').valueOf(),
        end: moment('2019-01-08 23:59:59:999').valueOf()
      });

      timestamp = moment('2018-11-30 11:10:01').valueOf();
      chai.expect(service.getInterval(30, timestamp)).to.deep.equal({
        start: moment('2018-11-30 00:00:00').valueOf(),
        end: moment('2018-12-29 23:59:59:999').valueOf()
      });
    });

    it('returns n-th of the previous month when month start is n > relative date', () => {
      let timestamp;

      timestamp = moment('2018-01-04 21:10:01').valueOf();
      chai.expect(service.getInterval(10, timestamp)).to.deep.equal({
        start: moment('2017-12-10 00:00:00').valueOf(),
        end: moment('2018-01-09 23:59:59:999').valueOf()
      });

      timestamp = moment('2018-02-6 21:10:01').valueOf();
      chai.expect(service.getInterval(10, timestamp)).deep.to.equal({
        start: moment('2018-01-10 00:00:00').valueOf(),
        end: moment('2018-02-09 23:59:59:999').valueOf()
      });

      timestamp = moment('2018-03-18 11:10:01').valueOf();
      chai.expect(service.getInterval(25, timestamp)).to.deep.equal({
        start: moment('2018-02-25 00:00:00').valueOf(),
        end: moment('2018-03-24 23:59:59:999').valueOf()
      });

      timestamp = moment('2018-12-05 11:10:01').valueOf();
      chai.expect(service.getInterval(29, timestamp)).to.deep.equal({
        start: moment('2018-11-29 00:00:00').valueOf(),
        end: moment('2018-12-28 23:59:59:999').valueOf()
      });
    });

    it('returns first day of month when start date exceeds previous month day number', () => {
      let timestamp;

      timestamp = moment('2016-03-12 16:10:10').valueOf();
      chai.expect(service.getInterval(31, timestamp)).to.deep.equal({
        start: moment('2016-03-01 00:00:00').valueOf(),
        end: moment('2016-03-30 23:59:59:999').valueOf()
      });
      chai.expect(service.getInterval(30, timestamp)).to.deep.equal({
        start: moment('2016-03-01 00:00:00').valueOf(),
        end: moment('2016-03-29 23:59:59:999').valueOf()
      });
      chai.expect(service.getInterval(29, timestamp)).to.deep.equal({
        start: moment('2016-02-29 00:00:00').valueOf(),
        end: moment('2016-03-28 23:59:59:999').valueOf()
      });
      chai.expect(service.getInterval(28, timestamp)).to.deep.equal({
        start: moment('2016-02-28 00:00:00').valueOf(),
        end: moment('2016-03-27 23:59:59:999').valueOf()
      });

      timestamp = moment('2017-03-12 02:02:02').valueOf();
      chai.expect(service.getInterval(31, timestamp)).to.deep.equal({
        start: moment('2017-03-01 00:00:00').valueOf(),
        end: moment('2017-03-30 23:59:59:999').valueOf()
      });
      chai.expect(service.getInterval(30, timestamp)).to.deep.equal({
        start: moment('2017-03-01 00:00:00').valueOf(),
        end: moment('2017-03-29 23:59:59:999').valueOf()
      });
      chai.expect(service.getInterval(29, timestamp)).to.deep.equal({
        start: moment('2017-03-01 00:00:00').valueOf(),
        end: moment('2017-03-28 23:59:59:999').valueOf()
      });
      chai.expect(service.getInterval(28, timestamp)).to.deep.equal({
        start: moment('2017-02-28 00:00:00').valueOf(),
        end: moment('2017-03-27 23:59:59:999').valueOf()
      });
      chai.expect(service.getInterval(27, timestamp)).to.deep.equal({
        start: moment('2017-02-27 00:00:00').valueOf(),
        end: moment('2017-03-26 23:59:59:999').valueOf()
      });
    });

    it('returns last day of month when start date exceeds month day number', () => {
      let timestamp;

      timestamp = moment('2016-02-12 16:10:10').valueOf();
      chai.expect(service.getInterval(31, timestamp)).to.deep.equal({
        start: moment('2016-01-31 00:00:00').valueOf(),
        end: moment('2016-02-29 23:59:59:999').valueOf()
      });
      chai.expect(service.getInterval(30, timestamp)).to.deep.equal({
        start: moment('2016-01-30 00:00:00').valueOf(),
        end: moment('2016-02-29 23:59:59:999').valueOf()
      });

      timestamp = moment('2017-02-12 02:02:02').valueOf();
      chai.expect(service.getInterval(31, timestamp)).to.deep.equal({
        start: moment('2017-01-31 00:00:00').valueOf(),
        end: moment('2017-02-28 23:59:59:999').valueOf()
      });
      chai.expect(service.getInterval(30, timestamp)).to.deep.equal({
        start: moment('2017-01-30 00:00:00').valueOf(),
        end: moment('2017-02-28 23:59:59:999').valueOf()
      });
      chai.expect(service.getInterval(29, timestamp)).to.deep.equal({
        start: moment('2017-01-29 00:00:00').valueOf(),
        end: moment('2017-02-28 23:59:59:999').valueOf()
      });
      chai.expect(service.getInterval(28, timestamp)).to.deep.equal({
        start: moment('2017-01-28 00:00:00').valueOf(),
        end: moment('2017-02-27 23:59:59:999').valueOf()
      });

      timestamp = moment('2016-01-31 16:10:10').valueOf();
      chai.expect(service.getInterval(31, timestamp)).to.deep.equal({
        start: moment('2016-01-31 00:00:00').valueOf(),
        end: moment('2016-02-29 23:59:59:999').valueOf()
      });
      chai.expect(service.getInterval(30, timestamp)).to.deep.equal({
        start: moment('2016-01-30 00:00:00').valueOf(),
        end: moment('2016-02-29 23:59:59:999').valueOf()
      });

      chai.expect(service.getInterval(29, timestamp)).to.deep.equal({
        start: moment('2016-01-29 00:00:00').valueOf(),
        end: moment('2016-02-28 23:59:59:999').valueOf()
      });

      timestamp = moment('2017-01-31 02:02:02').valueOf();
      chai.expect(service.getInterval(31, timestamp)).to.deep.equal({
        start: moment('2017-01-31 00:00:00').valueOf(),
        end: moment('2017-02-28 23:59:59:999').valueOf()
      });
      chai.expect(service.getInterval(30, timestamp)).to.deep.equal({
        start: moment('2017-01-30 00:00:00').valueOf(),
        end: moment('2017-02-28 23:59:59:999').valueOf()
      });
      chai.expect(service.getInterval(29, timestamp)).to.deep.equal({
        start: moment('2017-01-29 00:00:00').valueOf(),
        end: moment('2017-02-28 23:59:59:999').valueOf()
      });
      chai.expect(service.getInterval(28, timestamp)).to.deep.equal({
        start: moment('2017-01-28 00:00:00').valueOf(),
        end: moment('2017-02-27 23:59:59:999').valueOf()
      });
    });
  });
});
