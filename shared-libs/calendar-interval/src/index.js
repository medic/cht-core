const moment = require('moment');

const normalizeStartDate = function(intervalStartDate) {
  intervalStartDate = parseInt(intervalStartDate);

  if (isNaN(intervalStartDate) || intervalStartDate <= 0 || intervalStartDate > 31) {
    intervalStartDate = 1;
  }

  return intervalStartDate;
};

const getMinimumStartDate = function(intervalStartDate, relativeDate) {
  return moment
    .min(
      moment(relativeDate).subtract(1, 'month').date(intervalStartDate).startOf('day'),
      moment(relativeDate).startOf('month')
    )
    .valueOf();
};

const getMinimumEndDate = function(intervalStartDate, nextMonth, relativeDate) {
  return moment
    .min(
      moment(relativeDate).add(nextMonth ? 1 : 0, 'month').date(intervalStartDate - 1).endOf('day'),
      moment(relativeDate).add(nextMonth ? 1 : 0, 'month').endOf('month')
    )
    .valueOf();
};

module.exports = {
  // Returns the timestamps of the start and end of the current calendar interval
  // @param {Number} [intervalStartDate=1] - day of month when interval starts (1 - 31)
  //
  // if `intervalStartDate` exceeds month's day count, the start/end of following/current month is returned
  // f.e. `intervalStartDate` === 31 would generate next intervals :
  // [12-31 -> 01-30], [01-31 -> 02-[28|29]], [03-01 -> 03-30], [03-31 -> 04-30], [05-01 -> 05-30], [05-31 - 06-30]
  getCurrent: function(intervalStartDate) {
    intervalStartDate = normalizeStartDate(intervalStartDate);

    if (intervalStartDate === 1) {
      return {
        start: moment().startOf('month').valueOf(),
        end: moment().endOf('month').valueOf()
      };
    }

    if (intervalStartDate <= moment().date()) {
      return {
        start: moment().date(intervalStartDate).startOf('day').valueOf(),
        end: getMinimumEndDate(intervalStartDate, true)
      };
    }

    return {
      start: getMinimumStartDate(intervalStartDate),
      end: getMinimumEndDate(intervalStartDate)
    };
  }
};
