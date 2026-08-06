const moment = require('moment');

const normalizeStartDate = (intervalStartDate, useBikramSambatMonths) => {
  intervalStartDate = parseInt(intervalStartDate);
  const maxDays = useBikramSambatMonths ? 32 : 31;

  if (Number.isNaN(intervalStartDate) || intervalStartDate <= 0 || intervalStartDate > maxDays) {
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

const getBSMonthOffset = (year, month, offset) => {
  let y = year;
  let m = month + offset;
  while (m > 12) {
    m -= 12;
    y += 1;
  }
  while (m < 1) {
    m += 12;
    y -= 1;
  }
  return { year: y, month: m };
};

const getBSStart = (bikramSambat, year, month, intervalStartDate) => {
  const maxDays = bikramSambat.daysInMonth(year, month);
  if (intervalStartDate > maxDays) {
    const nextMonth = getBSMonthOffset(year, month, 1);
    return { year: nextMonth.year, month: nextMonth.month, day: 1 };
  }
  return { year, month, day: intervalStartDate };
};

const getBSEnd = (bikramSambat, year, month, intervalStartDate) => {
  const maxDays = bikramSambat.daysInMonth(year, month);
  const day = intervalStartDate - 1;
  return { year, month, day: Math.min(day, maxDays) };
};

const getBikramSambatInterval = (intervalStartDate, referenceDate) => {
  const bikramSambat = require('bikram-sambat');
  const bsRef = bikramSambat.toBik(referenceDate.format('YYYY-MM-DD'));

  let startBS;
  let endBS;

  if (intervalStartDate === 1) {
    startBS = { year: bsRef.year, month: bsRef.month, day: 1 };
    endBS = { year: bsRef.year, month: bsRef.month, day: bikramSambat.daysInMonth(bsRef.year, bsRef.month) };
  } else if (bsRef.day >= intervalStartDate) {
    const nextMonth = getBSMonthOffset(bsRef.year, bsRef.month, 1);
    startBS = getBSStart(bikramSambat, bsRef.year, bsRef.month, intervalStartDate);
    endBS = getBSEnd(bikramSambat, nextMonth.year, nextMonth.month, intervalStartDate);
  } else {
    const prevMonth = getBSMonthOffset(bsRef.year, bsRef.month, -1);
    startBS = getBSStart(bikramSambat, prevMonth.year, prevMonth.month, intervalStartDate);
    endBS = getBSEnd(bikramSambat, bsRef.year, bsRef.month, intervalStartDate);
  }

  const gregStartText = bikramSambat.toGreg_text(startBS.year, startBS.month, startBS.day);
  const gregEndText = bikramSambat.toGreg_text(endBS.year, endBS.month, endBS.day);

  let startMoment;
  let endMoment;
  if (referenceDate.isUTC()) {
    startMoment = moment.utc(gregStartText).startOf('day');
    endMoment = moment.utc(gregEndText).endOf('day');
  } else {
    startMoment = moment(gregStartText).startOf('day');
    endMoment = moment(gregEndText).endOf('day');
  }

  return {
    start: startMoment.valueOf(),
    end: endMoment.valueOf()
  };
};

const getGregorianInterval = (intervalStartDate, referenceDate) => {
  intervalStartDate = normalizeStartDate(intervalStartDate, false);
  if (intervalStartDate === 1) {
    return {
      start: referenceDate.startOf('month').valueOf(),
      end: referenceDate.endOf('month').valueOf()
    };
  }

  if (intervalStartDate <= referenceDate.date()) {
    return {
      start: referenceDate.date(intervalStartDate).startOf('day').valueOf(),
      end: getMinimumEndDate(intervalStartDate, true, referenceDate)
    };
  }

  return {
    start: getMinimumStartDate(intervalStartDate, referenceDate),
    end: getMinimumEndDate(intervalStartDate, false, referenceDate)
  };
};

const getInterval = (intervalStartDate, referenceDate, useBikramSambatMonths) => {
  referenceDate = referenceDate || moment();
  if (useBikramSambatMonths) {
    try {
      return getBikramSambatInterval(normalizeStartDate(intervalStartDate, true), referenceDate);
    } catch {
      // Fallback gracefully to Gregorian calculation if date is out of range
      return getGregorianInterval(intervalStartDate, referenceDate);
    }
  }
  return getGregorianInterval(intervalStartDate, referenceDate);
};

const getPreviousInterval = (intervalStartDate, referenceDate, useBikramSambatMonths) => {
  referenceDate = referenceDate || moment();
  const current = getInterval(intervalStartDate, referenceDate, useBikramSambatMonths);
  const prevDate = moment(current.start).subtract(1, 'day');
  return getInterval(intervalStartDate, prevDate, useBikramSambatMonths);
};

module.exports = {
  // Returns the timestamps of the start and end of the current calendar interval
  // @param {Number} [intervalStartDate=1] - day of month when interval starts (1 - 32)
  //
  // if `intervalStartDate` exceeds month's day count, the start/end of following/current month is returned
  getCurrent: (intervalStartDate, useBikramSambatMonths) => {
    return getInterval(intervalStartDate, moment(), useBikramSambatMonths);
  },

  /** Returns the timestamps of the start and the end of the previous calendar interval
   *  intervalStartDate: Number. Day of the month when interval starts
   *  referenceDate: Date.
   */
  getPrevious: (intervalStartDate, referenceDate, useBikramSambatMonths) => {
    if (referenceDate) {
      return getPreviousInterval(intervalStartDate, moment(referenceDate), useBikramSambatMonths);
    }
    return getPreviousInterval(intervalStartDate, undefined, useBikramSambatMonths);
  },

  /**
   * Returns the timestamps of the start and end of the a calendar interval that contains a reference date
   * @param {Number} [intervalStartDate=1] - day of month when interval starts (1 - 32)
   * @param {Number} timestamp - the reference date the interval should include
   * @returns { start: number, end: number } - timestamps that define the calendar interval
   */
  getInterval: (intervalStartDate, timestamp, useBikramSambatMonths) => {
    return getInterval(intervalStartDate, moment(timestamp), useBikramSambatMonths);
  },

  isEqual: (intervalA, intervalB) => !!intervalA &&
                                     intervalA?.start === intervalB?.start &&
                                     intervalA?.end === intervalB?.end,
};
