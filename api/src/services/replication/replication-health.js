const moment = require('moment');
const replicationLimitLog = require('./replication-limit-log');
const replicationFailureLog = require('./replication-failure-log');

const DAY_FORMAT = 'YYYY-MM-DD';
// Default staleness window: a user who has not successfully replicated within this many days is
// considered for the failed list when the caller doesn't supply an explicit `days` value.
const DEFAULT_STALE_DAYS = 30;
// "Any number of failures counts" — flag a user with at least one failure within the window.
const DEFAULT_MIN_FAILURES = 1;

const sumFailuresSince = (dailyFailures = {}, sinceDay) => {
  return Object.keys(dailyFailures)
    .filter(day => day >= sinceDay)
    .reduce((total, day) => total + dailyFailures[day], 0);
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
    return new Map();
  }

  const earliestDay = moment(Math.min(...logDates)).format(DAY_FORMAT);
  const failuresByUser = await replicationFailureLog.getDailyFailuresByUserSince(earliestDay);
  return new Map(failing
    .filter(entry => logsByUser[entry.user]?.date)
    .map(entry => {
      const sinceDay = moment(logsByUser[entry.user].date).format(DAY_FORMAT);
      return [entry.user, sumFailuresSince(failuresByUser[entry.user], sinceDay)];
    }));
};

/**
 * Lists users that appear unable to replicate within the `days` window: they have logged at least
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
    failures_since_last_replication: failuresSinceByUser.get(entry.user) ?? null,
    failures_in_window: entry.failuresInWindow,
  }));

  return { users };
};

module.exports = {
  getFailed,
  DEFAULT_MIN_FAILURES,
};
