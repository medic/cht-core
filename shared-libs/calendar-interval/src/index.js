const moment = require('moment');
const bikramSambat = require('bikram-sambat');

const normalizeStartDate = (intervalStartDate) => {
  intervalStartDate = parseInt(intervalStartDate);

  if (isNaN(intervalStartDate) || intervalStartDate <= 0 || intervalStartDate > 31) {
    intervalStartDate = 1;
  }

  return intervalStartDate;
};

const getMinimumStartDate = (intervalStartDate, relativeDate) => {
  return moment
    .min(
      relativeDate.clone().subtract(1, 'month').date(intervalStartDate).startOf('day'),
      relativeDate.clone().startOf('month')
    )
    .valueOf();
};

const getMinimumEndDate = (intervalStartDate, nextMonth, relativeDate) => {
  return moment
    .min(
      relativeDate.clone().add(nextMonth ? 1 : 0, 'month').date(intervalStartDate - 1).endOf('day'),
      relativeDate.clone().add(nextMonth ? 1 : 0, 'month').endOf('month')
    )
    .valueOf();
};

const getGregorianInterval = (intervalStartDate, referenceDate) => {
  intervalStartDate = normalizeStartDate(intervalStartDate);
  if (intervalStartDate === 1) {
    return {
      start: referenceDate.clone().startOf('month').valueOf(),
      end: referenceDate.clone().endOf('month').valueOf()
    };
  }

  if (intervalStartDate <= referenceDate.date()) {
    return {
      start: referenceDate.clone().date(intervalStartDate).startOf('day').valueOf(),
      end: getMinimumEndDate(intervalStartDate, true, referenceDate)
    };
  }

  return {
    start: getMinimumStartDate(intervalStartDate, referenceDate),
    end: getMinimumEndDate(intervalStartDate, false, referenceDate)
  };
};

const bsMonthNav = (year, month, delta) => {
  month += delta;
  if (month > 12) {
    month = 1;
    year++;
  } else if (month < 1) {
    month = 12;
    year--;
  }
  return { year, month };
};

const getBikramSambatInterval = (intervalStartDate, referenceDate) => {
  intervalStartDate = normalizeStartDate(intervalStartDate);
  const refBs = bikramSambat.toBik(referenceDate.toDate());

  let startBs;
  let endBs;

  if (intervalStartDate === 1) {
    startBs = { year: refBs.year, month: refBs.month, day: 1 };
    endBs = { year: refBs.year, month: refBs.month, day: bikramSambat.daysInMonth(refBs.year, refBs.month) };
  } else if (intervalStartDate <= refBs.day) {
    const next = bsMonthNav(refBs.year, refBs.month, 1);
    const daysInNext = bikramSambat.daysInMonth(next.year, next.month);
    startBs = { year: refBs.year, month: refBs.month, day: intervalStartDate };
    endBs = { year: next.year, month: next.month, day: Math.min(intervalStartDate - 1, daysInNext) };
  } else {
    const prev = bsMonthNav(refBs.year, refBs.month, -1);
    const daysInPrev = bikramSambat.daysInMonth(prev.year, prev.month);
    const daysInCurrent = bikramSambat.daysInMonth(refBs.year, refBs.month);
    startBs = { year: prev.year, month: prev.month, day: Math.min(intervalStartDate, daysInPrev) };
    endBs = { year: refBs.year, month: refBs.month, day: Math.min(intervalStartDate - 1, daysInCurrent) };
  }

  const startG = bikramSambat.toGreg(startBs.year, startBs.month, startBs.day);
  const endG = bikramSambat.toGreg(endBs.year, endBs.month, endBs.day);

  return {
    start: moment([startG.year, startG.month - 1, startG.day]).startOf('day').valueOf(),
    end: moment([endG.year, endG.month - 1, endG.day]).endOf('day').valueOf()
  };
};

const getInterval = (intervalStartDate, referenceDate, useBikramSambat) => {
  if (useBikramSambat) {
    return getBikramSambatInterval(intervalStartDate, referenceDate);
  }
  return getGregorianInterval(intervalStartDate, referenceDate);
};

const getPreviousInterval = (intervalStartDate, referenceDate, useBikramSambat) => {
  if (useBikramSambat) {
    const bs = bikramSambat.toBik(referenceDate.toDate());
    const prev = bsMonthNav(bs.year, bs.month, -1);
    const prevDay = Math.min(bs.day, bikramSambat.daysInMonth(prev.year, prev.month));
    const prevRefG = bikramSambat.toGreg(prev.year, prev.month, prevDay);
    return getInterval(intervalStartDate, moment(new Date(prevRefG.year, prevRefG.month - 1, prevRefG.day)), true);
  }

  referenceDate = referenceDate.clone().subtract(1, 'month');
  return getInterval(intervalStartDate, referenceDate);
};

module.exports = {
  // Returns the timestamps of the start and end of the current calendar interval
  // @param {Number} [intervalStartDate=1] - day of month when interval starts (1 - 31)
  // @param {Date|Boolean} [referenceDate] - optional reference date, or useBikramSambat if boolean
  // @param {Boolean} [useBikramSambat=false] - whether to use Bikram Sambat calendar
  //
  // if `intervalStartDate` exceeds month's day count, the start/end of following/current month is returned
  getCurrent: (intervalStartDate, referenceDate, useBikramSambat) => {
    if (typeof referenceDate === 'boolean') {
      useBikramSambat = referenceDate;
      referenceDate = undefined;
    }
    return getInterval(intervalStartDate, referenceDate ? moment(referenceDate) : moment(), useBikramSambat);
  },

  /** Returns the timestamps of the start and the end of the previous calendar interval
   *  intervalStartDate: Number. Day of the month when interval starts
   *  referenceDate: Date.
   *  useBikramSambat: Boolean.
   */
  getPrevious: (intervalStartDate, referenceDate, useBikramSambat) => {
    if (typeof referenceDate === 'boolean') {
      useBikramSambat = referenceDate;
      referenceDate = undefined;
    }
    return getPreviousInterval(intervalStartDate, referenceDate ? moment(referenceDate) : moment(), useBikramSambat);
  },

  /**
   * Returns the timestamps of the start and end of the a calendar interval that contains a reference date
   * @param {Number} [intervalStartDate=1] - day of month when interval starts (1 - 31)
   * @param {Number} timestamp - the reference date the interval should include
   * @param {Boolean} [useBikramSambat=false] - whether to use Bikram Sambat calendar
   * @returns { start: number, end: number } - timestamps that define the calendar interval
   */
  getInterval: (intervalStartDate, timestamp, useBikramSambat) => {
    return getInterval(intervalStartDate, moment(timestamp), useBikramSambat);
  },

  isEqual: (intervalA, intervalB) => !!intervalA &&
                                     intervalA?.start === intervalB?.start &&
                                     intervalA?.end === intervalB?.end,
};
