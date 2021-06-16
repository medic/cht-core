const later = require('later');

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

module.exports = {
  getSchedule,
  nextScheduleMillis,
};
