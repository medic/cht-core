var moment = require('moment');

/**
 * Is responsible for returning a date string in an absolute format.
 */
function getAbsoluteDateString(date, options) {
  if (options.withoutTime) {
    return options.FormatDate.date(date);
  }
  return options.FormatDate.datetime(date);
}

/**
 * Is responsible for returning a date string in the relative format.
 */
function getRelativeDateString(date, options) {
  if (options.age) {
    return options.FormatDate.age(date);
  } else if (!options.withoutTime && moment(date).isSame(moment(), 'day')) {
    return options.FormatDate.time(date);
  } else {
    return options.FormatDate.relative(date, options);
  }
}

/**
 * Is responsible for returning the classes for the relative date span.
 */
function getRelativeDateClasses(momentDate, options) {
  var classes = ['relative-date'];
  var now = moment();
  if (options.withoutTime) {
    now = now.startOf('day');
  }

  if (momentDate.isBefore(now)) {
    classes.push('past');
  } else {
    classes.push('future');
  }

  return classes;
}

module.exports = {
  getAbsoluteDateString: getAbsoluteDateString,
  getRelativeDateClasses: getRelativeDateClasses,
  getRelativeDateString: getRelativeDateString,
};
