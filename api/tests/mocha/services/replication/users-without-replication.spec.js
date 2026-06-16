const sinon = require('sinon');
const moment = require('moment');
const replicationLimitLog = require('../../../../src/services/replication/replication-limit-log');
const replicationFailureLog = require('../../../../src/services/replication/replication-failure-log');
const service = require('../../../../src/services/replication/users-without-replication');

describe('Users Without Replication service', () => {
  let getStaleLogs;
  let getDailyFailuresByUserSince;

  beforeEach(() => {
    getStaleLogs = sinon.stub(replicationLimitLog, 'getStaleLogs');
    getDailyFailuresByUserSince = sinon.stub(replicationFailureLog, 'getDailyFailuresByUserSince');
  });

  afterEach(() => {
    sinon.restore();
  });

  // 2026-06-16; one month ago is 2026-05-16.
  const fakeNow = () => sinon.useFakeTimers(new Date('2026-06-16T12:00:00Z').valueOf());
  const day = (date) => moment(date).format('YYYY-MM-DD');

  it('should delegate the staleness cutoff to the limit-log service', async () => {
    getStaleLogs.resolves([]);

    await service.get();

    expect(getStaleLogs.callCount).to.equal(1);
    expect(getStaleLogs.args[0]).to.deep.equal([]);
  });

  it('should return no users when there are no stale logs', async () => {
    getStaleLogs.resolves([]);

    const result = await service.get();

    expect(result).to.deep.equal({ users: [] });
    expect(getDailyFailuresByUserSince.callCount).to.equal(0);
  });

  it('should count failures per user since that user\'s own last log', async () => {
    fakeNow();
    const aliceDate = new Date('2026-03-10T00:00:00Z').valueOf();
    const bobDate = new Date('2026-04-20T00:00:00Z').valueOf();
    getStaleLogs.resolves([
      { user: 'alice', date: aliceDate },
      { user: 'bob', date: bobDate },
    ]);
    getDailyFailuresByUserSince.resolves({
      alice: { '2026-03-09': 5, '2026-03-15': 2, '2026-05-01': 1 }, // 2026-03-09 predates alice's log
      bob: { '2026-04-25': 4 },
    });

    const result = await service.get();

    // Query starts from the earliest stale log day (alice's).
    expect(getDailyFailuresByUserSince.args[0][0]).to.equal(day(aliceDate));
    expect(result).to.deep.equal({
      users: [
        { user: 'alice', last_replication_date: aliceDate, failures_since_last_replication: 3 },
        { user: 'bob', last_replication_date: bobDate, failures_since_last_replication: 4 },
      ],
    });
  });

  it('should exclude stale users with no failures since their last log', async () => {
    fakeNow();
    const oldDate = new Date('2026-03-10T00:00:00Z').valueOf();
    getStaleLogs.resolves([
      { user: 'noFailures', date: oldDate },
      { user: 'onlyOldFailures', date: oldDate },
    ]);
    getDailyFailuresByUserSince.resolves({
      onlyOldFailures: { '2026-03-09': 9 }, // all failures predate the log day
    });

    const result = await service.get();

    expect(result).to.deep.equal({ users: [] });
  });

  it('should honour a custom minFailures threshold', async () => {
    fakeNow();
    const date = new Date('2026-03-10T00:00:00Z').valueOf();
    getStaleLogs.resolves([
      { user: 'alice', date },
      { user: 'bob', date },
    ]);
    getDailyFailuresByUserSince.resolves({
      alice: { '2026-03-15': 2 },
      bob: { '2026-03-15': 5 },
    });

    const result = await service.get({ minFailures: 3 });

    expect(result.users.map(u => u.user)).to.deep.equal(['bob']);
  });

  it('should propagate errors from the limit log query', async () => {
    fakeNow();
    getStaleLogs.rejects({ status: 500 });

    try {
      await service.get();
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).to.deep.equal({ status: 500 });
    }
  });
});
