const moment = require('moment');
const replicationLimitLog = require('./replication-limit-log');
const replicationFailureLog = require('./replication-failure-log');

const DAY_FORMAT = 'YYYY-MM-DD';
// Default staleness window: a user who has not successfully replicated within this many days is
// considered for the failed list when the caller doesn't supply an explicit `days` value.
const DEFAULT_STALE_DAYS = 7;
// "Any number of failures counts" — flag a user with at least one failure since their last log.
const DEFAULT_MIN_FAILURES = 1;

const sumFailuresSince = (dailyFailures = {}, sinceDay) => {
  return Object.keys(dailyFailures)
    .filter(day => day >= sinceDay)
    .reduce((total, day) => total + dailyFailures[day], 0);
};

/**
 * Lists users that appear unable to replicate: their last successful replication predates `cutoff`
 * AND they have logged at least `minFailures` replication failures since that last replication.
 * Failures are counted per user from the day of their own last limit log onward.
 *
 * @param {object} [options]
 * @param {number} [options.days=7] staleness window in days; users whose last successful replication
 *   is older than this many days are considered. Defaults to DEFAULT_STALE_DAYS.
 * @param {number} [options.minFailures=1] minimum failures since the last log for a user to be listed
 * @returns {Promise<{ users: Array<{ user: string, last_replication_date: number,
 *   failures_since_last_replication: number }> }>}
 */
const getFailed = async ({ days = DEFAULT_STALE_DAYS, minFailures = DEFAULT_MIN_FAILURES } = {}) => {
  const cutoff = moment().subtract(days, 'days').valueOf();
  const staleLogs = await replicationLimitLog.getStaleLogs(cutoff);
  if (!staleLogs.length) {
    return { users: [] };
  }

  const earliestDay = moment(Math.min(...staleLogs.map(log => log.date))).format(DAY_FORMAT);
  const failuresByUser = await replicationFailureLog.getDailyFailuresByUserSince(earliestDay);

  const users = staleLogs
    .map(log => ({
      user: log.user,
      last_replication_date: log.date,
      failures_since_last_replication: sumFailuresSince(
        failuresByUser[log.user],
        moment(log.date).format(DAY_FORMAT)
      ),
    }))
    .filter(entry => entry.failures_since_last_replication >= minFailures);

  return { users };
};

module.exports = {
  getFailed,
  DEFAULT_MIN_FAILURES,
};
