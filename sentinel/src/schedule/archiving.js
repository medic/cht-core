const config = require('../config');
const logger = require('@medic/logger');
const archiveLib = require('../lib/archiving');
const scheduling = require('../lib/scheduling');

let archiveTimeout;

const isValidSchedule = schedule => Boolean(schedule) && !(schedule.error > -1);

module.exports = {
  /**
   * Schedules the next archiving run from the `archive` settings: `text_expression` or `cron`
   * decide when it fires, and the optional `duration` (e.g. "4 hours") bounds how long it runs —
   * unbounded when missing or malformed. When no schedule is configured, queued jobs are
   * processed immediately instead of stacking up forever. Called on every scheduler tick;
   * reschedules the pending run each time so config changes take effect.
   * @returns {Promise<void>}
   */
  execute: () => {
    const archiveConfig = config.get('archive');
    const schedule = scheduling.getSchedule(archiveConfig);
    const duration = scheduling.parseDuration(archiveConfig?.duration)?.asMilliseconds() ?? null;

    if (archiveTimeout) {
      clearTimeout(archiveTimeout);
    }

    const validSchedule = isValidSchedule(schedule);
    if (!validSchedule && (archiveConfig?.text_expression || archiveConfig?.cron)) {
      logger.error('Archiving: malformed schedule configuration %o, archiving immediately', archiveConfig);
    }

    // No schedule configured → run on the next tick instead of never letting jobs stack up.
    const delay = validSchedule ? scheduling.nextScheduleMillis(schedule) : 0;
    archiveTimeout = setTimeout(() => archiveLib.archive(duration), delay);
    return Promise.resolve();
  },
};
