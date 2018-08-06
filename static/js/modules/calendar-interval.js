var moment = require('moment');

(function () {

  'use strict';

  var normalizeStartDate = function(intervalStartDate) {
    intervalStartDate = parseInt(intervalStartDate);

    if (isNaN(intervalStartDate) || intervalStartDate <= 0 || intervalStartDate > 31) {
      intervalStartDate = 1;
    }

    return intervalStartDate;
  };

  var getMinimumStartDate = function(intervalStartDate, relativeDate) {
    return moment
      .min(
        moment(relativeDate).subtract(1, 'month').date(intervalStartDate).startOf('day'),
        moment(relativeDate).startOf('month')
      )
      .valueOf();
  };

  var getMinimumEndDate = function(intervalStartDate, nextMonth, relativeDate) {
    return moment
      .min(
        moment(relativeDate).add(nextMonth ? 1 : 0, 'month').date(intervalStartDate - 1).endOf('day'),
        moment(relativeDate).add(nextMonth ? 1 : 0, 'month').endOf('month')
      )
      .valueOf();
  };

  // Returns the timestamps of the beginning and end of a current calendar interval
  // @param {Number} [intervalStartDate=1] - day of month when interval starts (1 - 31)
  //
  // if `intervalStartDate` exceeds the month's day count, the start of following month is returned
  // fe `intervalStartDate` === 31 would generate following intervals :
  // [12-31 -> 01-30], [02-01 -> 02-[28|29]], [03-01 -> 03-30], [03-31 -> 04-30]
  exports.getCurrent = function(intervalStartDate) {
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
  };
}());
