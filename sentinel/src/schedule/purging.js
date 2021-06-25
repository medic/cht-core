const config = require('../config');
const later = require('later');
const purgeLib = require('../lib/purging');
const scheduling = require('../lib/scheduling');

// set later to use local time
later.date.localTime();
let purgeTimeout;

module.exports = {
  execute: () => {
    const purgeConfig = config.get('purge');
    const schedule = scheduling.getSchedule(purgeConfig);

    if (!schedule) {
      return Promise.resolve();
    }

    if (purgeTimeout) {
      clearTimeout(purgeTimeout);
    }
    purgeTimeout = setTimeout(purgeLib.purge, scheduling.nextScheduleMillis(schedule));
    return Promise.resolve();
  },
};
