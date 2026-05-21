const config = require('../config');
const later = require('later');
const moment = require('moment');
const archiveLib = require('../lib/archiving');
const scheduling = require('../lib/scheduling');

// set later to use local time
later.date.localTime();
let archiveTimeout;

// Parses a "<number> <unit>" string (e.g. "4 hours", "30 minutes") into milliseconds.
// Returns null if the input is missing, malformed, or resolves to a non-positive duration.
const parseDuration = (text) => {
  if (typeof text !== 'string') {
    return null;
  }
  const match = text.trim().match(/^(\d+)\s+(\w+)$/);
  if (!match) {
    return null;
  }
  const ms = moment.duration(parseInt(match[1], 10), match[2]).asMilliseconds();
  return ms > 0 ? ms : null;
};

module.exports = {
  execute: () => {
    const archiveConfig = config.get('archive');
    const schedule = scheduling.getSchedule(archiveConfig);

    if (!schedule) {
      return Promise.resolve();
    }

    const duration = parseDuration(archiveConfig && archiveConfig.duration);

    if (archiveTimeout) {
      clearTimeout(archiveTimeout);
    }
    archiveTimeout = setTimeout(
      () => archiveLib.archive({ duration }),
      scheduling.nextScheduleMillis(schedule)
    );
    return Promise.resolve();
  },
};
