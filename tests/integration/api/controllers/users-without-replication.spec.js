const utils = require('@utils');
const moment = require('moment');

const day = (m) => m.format('YYYY-MM-DD');
const period = (m) => m.format('YYYY-MM');

// Older than the one-month staleness cutoff used by the endpoint.
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

const getUsersWithoutReplication = (qs = {}) => utils.request({
  path: '/api/v1/users-without-replication',
  qs,
});

describe('users without replication', () => {
  const seededLimitLogIds = [];

  const seedLimitLog = async (doc) => {
    seededLimitLogIds.push(doc._id);
    await utils.logsDb.put(doc);
  };

  afterEach(async () => {
    if (seededLimitLogIds.length) {
      const result = await utils.logsDb.allDocs({ keys: seededLimitLogIds });
      const docs = result.rows
        .filter(row => row.value)
        .map(row => ({ _id: row.id, _rev: row.value.rev, _deleted: true }));
      await utils.logsDb.bulkDocs(docs);
      seededLimitLogIds.length = 0;
    }
    await utils.clearReplicationFailureLogs();
  });

  after(async () => {
    await utils.revertDb();
  });

  it('should list a user with a stale limit log and failures since that log', async () => {
    await seedLimitLog(limitLog('stale_failing', twoMonthsAgo()));
    await utils.logsDb.put(failureLog('stale_failing', { [day(recently())]: 3 }));

    const response = await getUsersWithoutReplication();

    const entry = response.users.find(u => u.user === 'stale_failing');
    expect(entry).to.deep.include({ user: 'stale_failing', failures_since_last_replication: 3 });
  });

  it('should not list a user whose limit log is recent', async () => {
    await seedLimitLog(limitLog('fresh_failing', recently()));
    await utils.logsDb.put(failureLog('fresh_failing', { [day(recently())]: 5 }));

    const response = await getUsersWithoutReplication();

    expect(response.users.find(u => u.user === 'fresh_failing')).to.be.undefined;
  });

  it('should not list a stale user with no failures', async () => {
    await seedLimitLog(limitLog('stale_clean', twoMonthsAgo()));

    const response = await getUsersWithoutReplication();

    expect(response.users.find(u => u.user === 'stale_clean')).to.be.undefined;
  });

  it('should only count failures logged on or after the user\'s last replication', async () => {
    const lastReplication = moment().subtract(10, 'days');
    await seedLimitLog(limitLog('boundary', lastReplication));
    await utils.logsDb.put(failureLog('boundary', {
      [day(moment().subtract(20, 'days'))]: 4, // before the last replication — excluded
      [day(moment().subtract(5, 'days'))]: 2, // after — counted
    }));

    const response = await getUsersWithoutReplication();

    const entry = response.users.find(u => u.user === 'boundary');
    expect(entry.failures_since_last_replication).to.equal(2);
  });

  it('should honour the min_failures query parameter', async () => {
    await seedLimitLog(limitLog('few_failures', twoMonthsAgo()));
    await utils.logsDb.put(failureLog('few_failures', { [day(recently())]: 2 }));

    const filtered = await getUsersWithoutReplication({ min_failures: 3 });
    expect(filtered.users.find(u => u.user === 'few_failures')).to.be.undefined;

    const included = await getUsersWithoutReplication({ min_failures: 2 });
    expect(included.users.find(u => u.user === 'few_failures')).to.not.be.undefined;
  });
});
