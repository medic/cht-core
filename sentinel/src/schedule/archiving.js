const config = require('../config');
const archiveLib = require('../lib/archiving');
const scheduling = require('../lib/scheduling');

let archiveTimeout;

module.exports = {
  /**
   * Schedules the next archiving run from the `archive` settings: `text_expression` or `cron`
   * decide when it fires, and the optional `duration` (e.g. "4 hours") bounds how long it runs —
   * unbounded when missing or malformed. Called on every scheduler tick; reschedules the pending
   * run each time so config changes take effect. A no-op when archiving is not configured.
   * @returns {Promise<void>}
   */
  execute: () => {
    const archiveConfig = config.get('archive');
    const schedule = scheduling.getSchedule(archiveConfig);

    if (!schedule) {
      return Promise.resolve();
    }

    const duration = scheduling.parseDuration(archiveConfig?.duration)?.asMilliseconds() ?? null;

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
