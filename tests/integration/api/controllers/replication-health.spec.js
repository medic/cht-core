const utils = require('@utils');
const moment = require('moment');

const day = (m) => m.format('YYYY-MM-DD');
const period = (m) => m.format('YYYY-MM');

// Older than the default 7-day staleness cutoff used by the endpoint.
const twoMonthsAgo = () => moment().subtract(2, 'months');
const recently = () => moment().subtract(3, 'days');

const limitLog = (user, date) => ({
  _id: `replication-count-${user}`,
  user,
  date: date.valueOf(),
  count: 1000,
  all_docs_count: 1000,
});

const failureLog = (user, dailyFailures) => {
  const total = Object.values(dailyFailures).reduce((sum, n) => sum + n, 0);
  return {
    _id: `replication-fail-${period(moment())}-${user}`,
    user,
    date: moment().valueOf(),
    total_failures: total,
    failures: [],
    daily_failures: dailyFailures,
  };
};

const getFailed = (qs = {}) => utils.request({ path: '/api/v1/replication-health/failed', qs });

describe('replication health', () => {
  afterEach(async () => {
    // Only remove the replication count and failure logs this suite seeds; leave other logs intact.
    await utils.deleteLogsByPrefix('replication-count-');
    await utils.deleteLogsByPrefix('replication-fail-');
  });

  after(async () => {
    await utils.revertDb();
  });

  describe('/failed', () => {
    it('should list a user with a stale limit log and failures since that log', async () => {
      const lastReplication = twoMonthsAgo();
      await utils.logsDb.put(limitLog('stale_failing', lastReplication));
      await utils.logsDb.put(failureLog('stale_failing', { [day(recently())]: 3 }));

      const response = await getFailed();

      expect(response).to.deep.equal({
        users: [
          {
            user: 'stale_failing',
            last_replication_date: lastReplication.valueOf(),
            failures_since_last_replication: 3,
            failures_in_window: 3,
          },
        ],
      });
    });

    it('should not list a user whose limit log is recent', async () => {
      await utils.logsDb.put(limitLog('fresh_failing', recently()));
      await utils.logsDb.put(failureLog('fresh_failing', { [day(recently())]: 5 }));

      const response = await getFailed();

      expect(response).to.deep.equal({ users: [] });
    });

    it('should not list a stale user with no failures', async () => {
      await utils.logsDb.put(limitLog('stale_clean', twoMonthsAgo()));

      const response = await getFailed();

      expect(response).to.deep.equal({ users: [] });
    });

    it('should only count failures logged on or after the user\'s last replication', async () => {
      const lastReplication = moment().subtract(40, 'days');
      await utils.logsDb.put(limitLog('boundary', lastReplication));
      await utils.logsDb.put(failureLog('boundary', {
        [day(moment().subtract(50, 'days'))]: 4, // before the last replication — excluded
        [day(moment().subtract(5, 'days'))]: 2, // after the last replication and in window — counted
      }));

      const response = await getFailed();

      expect(response).to.deep.equal({
        users: [
          {
            user: 'boundary',
            last_replication_date: lastReplication.valueOf(),
            failures_since_last_replication: 2,
            failures_in_window: 2,
          },
        ],
      });
    });

    it('should not list a stale user whose failures all predate the window', async () => {
      // Last replicated 60 days ago; last failure 40 days ago — nothing within the default 30-day window.
      const lastReplication = moment().subtract(60, 'days');
      await utils.logsDb.put(limitLog('old_failures', lastReplication));
      await utils.logsDb.put(failureLog('old_failures', { [day(moment().subtract(40, 'days'))]: 9 }));

      const response = await getFailed();

      expect(response).to.deep.equal({ users: [] });
    });

    it('should list a user that has never successfully replicated (no limit log)', async () => {
      // Failures within the window but no replication-count log at all.
      await utils.logsDb.put(failureLog('never_replicated', { [day(recently())]: 4 }));

      const response = await getFailed();

      expect(response).to.deep.equal({
        users: [
          {
            user: 'never_replicated',
            last_replication_date: null,
            failures_since_last_replication: null,
            failures_in_window: 4,
          },
        ],
      });
    });

    it('should honour the min_failures query parameter', async () => {
      const lastReplication = twoMonthsAgo();
      await utils.logsDb.put(limitLog('few_failures', lastReplication));
      await utils.logsDb.put(failureLog('few_failures', { [day(recently())]: 2 }));

      const filtered = await getFailed({ min_failures: 3 });
      expect(filtered).to.deep.equal({ users: [] });

      const included = await getFailed({ min_failures: 2 });
      expect(included).to.deep.equal({
        users: [
          {
            user: 'few_failures',
            last_replication_date: lastReplication.valueOf(),
            failures_since_last_replication: 2,
            failures_in_window: 2,
          },
        ],
      });
    });

    it('should honour an explicit days window and bound failures_in_window by it', async () => {
      // Last replicated 10 days ago, with failures both before and inside a 5-day window.
      const lastReplication = moment().subtract(10, 'days');
      await utils.logsDb.put(limitLog('days_user', lastReplication));
      await utils.logsDb.put(failureLog('days_user', {
        [day(moment().subtract(8, 'days'))]: 2, // since last replication, before a 5-day window
        [day(moment().subtract(3, 'days'))]: 3, // since last replication AND inside a 5-day window
      }));

      // days=5 → cutoff 5 days ago: last replication (10 days ago) is older → listed.
      // failures_since_last_replication counts both buckets (5); failures_in_window only the recent one (3).
      const stale = await getFailed({ days: 5 });
      expect(stale).to.deep.equal({
        users: [
          {
            user: 'days_user',
            last_replication_date: lastReplication.valueOf(),
            failures_since_last_replication: 5,
            failures_in_window: 3,
          },
        ],
      });

      // days=20 → cutoff 20 days ago: last replication (10 days ago) is more recent → not listed.
      const fresh = await getFailed({ days: 20 });
      expect(fresh).to.deep.equal({ users: [] });
    });
  });
});
