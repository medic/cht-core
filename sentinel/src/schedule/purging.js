const config = require('../config');
const later = require('later');
const purgeLib = require('../lib/purging');

// set later to use local time
later.date.localTime();
let purgeTimeout;

const getSchedule = config => {
  // fetch a schedule based on the configuration, parsing it as a "cron"
  // or "text" statement see:
  // http://bunkat.github.io/later/parsers.html
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

module.exports = {
  execute: cb => {
    const purgeConfig = config.get('purge');
    const schedule = getSchedule(purgeConfig);

    if (!schedule) {
      return cb();
    }

    if (purgeTimeout) {
      purgeTimeout.clear();
    }
    purgeTimeout = later.setTimeout(purgeLib.purge, schedule);
    cb();
  },
};
