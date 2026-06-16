const moment = require('moment');
const replicationLimitLog = require('./replication-limit-log');
const replicationFailureLog = require('./replication-failure-log');

const DAY_FORMAT = 'YYYY-MM-DD';
// "Any number of failures counts" — flag a user with at least one failure since their last log.
const DEFAULT_MIN_FAILURES = 1;

const sumFailuresSince = (dailyFailures = {}, sinceDay) => {
  return Object.keys(dailyFailures)
    .filter(day => day >= sinceDay)
    .reduce((total, day) => total + dailyFailures[day], 0);
};

/**
 * Lists users that appear unable to replicate: their replication limit log is older than a month
 * (so no successful replication has happened since) AND they have logged at least `minFailures`
 * replication failures since that last log. Failures are counted per user from the day of their
 * own last limit log onward, so the count reflects failures accrued since they last succeeded.
 *
 * @param {object} [options]
 * @param {number} [options.minFailures=1] minimum failures since the last log for a user to be listed
 * @returns {Promise<{ users: Array<{ user: string, last_replication_date: number,
 *   failures_since_last_replication: number }> }>}
 */
const get = async ({ minFailures = DEFAULT_MIN_FAILURES } = {}) => {
  const staleLogs = await replicationLimitLog.getStaleLogs();
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
  get,
  DEFAULT_MIN_FAILURES,
};
