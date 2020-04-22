const moment = require('moment');

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

const getInterval = (intervalStartDate, referenceDate = moment()) => {
  intervalStartDate = normalizeStartDate(intervalStartDate);
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

module.exports = {
  // Returns the timestamps of the start and end of the current calendar interval
  // @param {Number} [intervalStartDate=1] - day of month when interval starts (1 - 31)
  //
  // if `intervalStartDate` exceeds month's day count, the start/end of following/current month is returned
  // f.e. `intervalStartDate` === 31 would generate next intervals :
  // [12-31 -> 01-30], [01-31 -> 02-[28|29]], [03-01 -> 03-30], [03-31 -> 04-30], [05-01 -> 05-30], [05-31 - 06-30]
  getCurrent: (intervalStartDate) => getInterval(intervalStartDate),

  /**
   * Returns the timestamps of the start and end of the a calendar interval that contains a reference date
   * @param {Number} [intervalStartDate=1] - day of month when interval starts (1 - 31)
   * @param {Number} timestamp - the reference date the interval should include
   * @returns { start: number, end: number } - timestamps that define the calendar interval
   */
  getInterval: (intervalStartDate, timestamp) => getInterval(intervalStartDate, moment(timestamp)),
};
