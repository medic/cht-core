const later = require('later');
later.date.localTime();
const moment = require('moment');

// matches "<number> <unit>", e.g. "30 minutes": digits, whitespace, then a unit word
const DURATION_PATTERN = /^(\d+)\s+(\w+)$/;

/**
 * Fetch a schedule based on the configuration, parsing it as a "cron"
 * or "text" statement see:
 * http://bunkat.github.io/later/parsers.html
 *
 * @param {Object} config
 * @param {string} config.text_expression a text expression, like 'every 12 hours'
 * @param {string} config.cron a cron expression, like '* 1 * * *'
 * @return {Object} the schedule object parsed by later
 */
const getSchedule = config => {
  if (!config) {
    return;
  }
  if (config.text_expression) {
    // text expression takes precedence over cron
    return later.parse.text(config.text_expression);
  }
  if (config.cron) {
    return later.parse.cron(config.cron);
  }
};

/**
 * Return the milliseconds ahead for the first job scheduled.
 * @param scheduleConfig a scheduling configuration parsed by "later"
 * @return {number} milliseconds ahead
 */
const nextScheduleMillis = scheduleConfig => {
  const schedule = later.schedule(scheduleConfig);
  const diff = schedule.next().getTime() - Date.now();
  return diff;
};

/**
 * Parses a "<number> <unit>" string (e.g. "4 hours", "30 minutes") into a moment.duration.
 * Accepts any unit moment recognizes.
 * @param {string} text
 * @return {moment.Duration|null} null when the input is missing, malformed, or not positive
 */
const parseDuration = (text) => {
  if (typeof text !== 'string') {
    return null;
  }
  const match = DURATION_PATTERN.exec(text.trim());
  if (!match) {
    return null;
  }
  const duration = moment.duration(Number.parseInt(match[1], 10), match[2]);
  return duration.asMilliseconds() > 0 ? duration : null;
};

module.exports = {
  getSchedule,
  nextScheduleMillis,
  parseDuration,
};
