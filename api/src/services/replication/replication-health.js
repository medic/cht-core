const moment = require('moment');
const replicationLimitLog = require('./replication-limit-log');
const replicationFailureLog = require('./replication-failure-log');

const DAY_FORMAT = 'YYYY-MM-DD';
const DEFAULT_STALE_DAYS = 30;
const DEFAULT_MIN_FAILURES = 1;

const sumFailuresSince = (dailyFailures, sinceDay) => {
  return Object.keys(dailyFailures || {})
    .filter(day => day >= sinceDay)
    .reduce((total, day) => total + (dailyFailures[day] || 0), 0);
};

const sumFailures = (dailyFailures = {}) => Object.values(dailyFailures).reduce((total, n) => total + n, 0);

// Computes failures_since_last_replication for each failing user. Users that have never successfully
// replicated (no limit log) get null — "since last replication" is undefined for them. Users with an
// old limit log need failures counted from their last-replication day, which predates the window, so
// this re-queries the failure view back to the earliest such day (a no-op when nobody has a log).
const getFailuresSinceLastReplication = async (failing, logsByUser) => {
  const logDates = failing
    .map(entry => logsByUser[entry.user]?.date)
    .filter(Boolean);
  if (!logDates.length) {
    return {};
  }

  const earliestDay = moment(Math.min(...logDates)).format(DAY_FORMAT);
  const failuresByUser = await replicationFailureLog.getDailyFailuresByUserSince(earliestDay);
  const failuresSinceByUser = {};
  for (const entry of failing) {
    const date = logsByUser[entry.user]?.date;
    if (date) {
      const sinceDay = moment(date).format(DAY_FORMAT);
      failuresSinceByUser[entry.user] = sumFailuresSince(failuresByUser[entry.user], sinceDay);
    }
  }
  return failuresSinceByUser;
};

/**
 * Lists users that were unable to replicate within the `days` window: they have logged at least
 * `minFailures` replication failures inside the window AND have not successfully replicated within it
 * Each listed user reports two failure counts:
 *  - `failures_in_window`: failures within the window (from the cutoff day onward). This is what
 *     `minFailures` is applied to.
 *  - `failures_since_last_replication`: failures from the day of their last successful replication
 *     onward. `null` for users that have never successfully replicated.
 *
 * @param {object} [options]
 * @param {number} [options.days=30] staleness window in days; users that have not successfully
 *   replicated within this many days are considered. Defaults to DEFAULT_STALE_DAYS.
 * @param {number} [options.minFailures=1] minimum failures within the window for a user to be listed
 * @returns {Promise<{ users: Array<{ user: string, last_replication_date: number|null,
 *   failures_since_last_replication: number|null, failures_in_window: number }> }>}
 */
const getFailed = async ({ days = DEFAULT_STALE_DAYS, minFailures = DEFAULT_MIN_FAILURES } = {}) => {
  const cutoff = moment().subtract(days, 'days').valueOf();
  const cutoffDay = moment(cutoff).format(DAY_FORMAT);

  const windowFailuresByUser = await replicationFailureLog.getDailyFailuresByUserSince(cutoffDay);
  const candidates = Object.keys(windowFailuresByUser)
    .map(user => ({ user, failuresInWindow: sumFailures(windowFailuresByUser[user]) }))
    .filter(entry => entry.failuresInWindow >= minFailures);
  if (!candidates.length) {
    return { users: [] };
  }

  const logsByUser = await replicationLimitLog.getLogsForUsers(candidates.map(entry => entry.user));
  const failing = candidates.filter(entry => {
    const log = logsByUser[entry.user];
    return !log?.date || log.date < cutoff;
  });

  const failuresSinceByUser = await getFailuresSinceLastReplication(failing, logsByUser);

  const users = failing.map(entry => ({
    user: entry.user,
    last_replication_date: logsByUser[entry.user]?.date ?? null,
    failures_since_last_replication: failuresSinceByUser[entry.user] ?? null,
    failures_in_window: entry.failuresInWindow,
  }));

  return { users };
};

module.exports = {
  getFailed,
  DEFAULT_MIN_FAILURES,
};
