const sinon = require('sinon');
const replicationLimitLog = require('../../../../src/services/replication/replication-limit-log');
const replicationFailureLog = require('../../../../src/services/replication/replication-failure-log');
const service = require('../../../../src/services/replication/replication-health');

describe('Replication Health service', () => {
  let getLogsForUsers;
  let getDailyFailuresByUserSince;

  beforeEach(() => {
    getLogsForUsers = sinon.stub(replicationLimitLog, 'getLogsForUsers');
    getDailyFailuresByUserSince = sinon.stub(replicationFailureLog, 'getDailyFailuresByUserSince');
  });

  afterEach(() => {
    sinon.restore();
  });

  // Now: 2026-06-16. Default 30-day window → cutoff day 2026-05-17.
  const fakeNow = () => sinon.useFakeTimers(new Date('2026-06-16T12:00:00Z').valueOf());

  describe('getFailed', () => {
    it('should query failures within the window using the cutoff day', async () => {
      fakeNow();
      getDailyFailuresByUserSince.resolves({});

      await service.getFailed({ days: 7 });

      // days=7 → cutoff 2026-06-09.
      expect(getDailyFailuresByUserSince.callCount).to.equal(1);
      expect(getDailyFailuresByUserSince.args[0][0]).to.equal('2026-06-09');
    });

    it('should default the window to 30 days when no days are given', async () => {
      fakeNow();
      getDailyFailuresByUserSince.resolves({});

      await service.getFailed();

      expect(getDailyFailuresByUserSince.args[0][0]).to.equal('2026-05-17');
    });

    it('should return no users and not read limit logs when nobody fails within the window', async () => {
      fakeNow();
      getDailyFailuresByUserSince.resolves({});

      const result = await service.getFailed();

      expect(result).to.deep.equal({ users: [] });
      expect(getLogsForUsers.callCount).to.equal(0);
    });

    it('should report in-window and since-last-replication counts for stale users', async () => {
      fakeNow();
      const aliceDate = new Date('2026-03-10T00:00:00Z').valueOf();
      const bobDate = new Date('2026-04-20T00:00:00Z').valueOf();

      // First call: failures within the window (from cutoff day 2026-05-17).
      getDailyFailuresByUserSince.withArgs('2026-05-17').resolves({
        alice: { '2026-06-12': 1 },
        bob: { '2026-06-10': 3 },
      });
      getLogsForUsers.resolves({
        alice: { user: 'alice', date: aliceDate },
        bob: { user: 'bob', date: bobDate },
      });
      // Second call: failures back to the earliest last-replication day (alice's, 2026-03-10).
      getDailyFailuresByUserSince.withArgs('2026-03-10').resolves({
        alice: { '2026-03-15': 2, '2026-06-12': 1 },
        bob: { '2026-04-25': 4, '2026-06-10': 3 },
      });

      const result = await service.getFailed();

      expect(getLogsForUsers.args[0][0]).to.deep.equal(['alice', 'bob']);
      expect(result).to.deep.equal({
        users: [
          {
            user: 'alice',
            last_replication_date: aliceDate,
            failures_since_last_replication: 3,
            failures_in_window: 1,
          },
          {
            user: 'bob',
            last_replication_date: bobDate,
            failures_since_last_replication: 7,
            failures_in_window: 3,
          },
        ],
      });
    });

    it('should include users that have never successfully replicated with null replication fields', async () => {
      fakeNow();
      getDailyFailuresByUserSince.withArgs('2026-05-17').resolves({
        neverReplicated: { '2026-06-10': 4 },
      });
      getLogsForUsers.resolves({}); // no limit log for this user

      const result = await service.getFailed();

      // No user has a log, so no second (since-last-replication) query is needed.
      expect(getDailyFailuresByUserSince.callCount).to.equal(1);
      expect(result).to.deep.equal({
        users: [
          {
            user: 'neverReplicated',
            last_replication_date: null,
            failures_since_last_replication: null,
            failures_in_window: 4,
          },
        ],
      });
    });

    it('should exclude users that have replicated successfully within the window', async () => {
      fakeNow();
      getDailyFailuresByUserSince.withArgs('2026-05-17').resolves({
        active: { '2026-06-10': 5 },
      });
      // Limit log newer than the cutoff → replicated within the window → excluded.
      getLogsForUsers.resolves({
        active: { user: 'active', date: new Date('2026-06-12T00:00:00Z').valueOf() },
      });

      const result = await service.getFailed();

      expect(result).to.deep.equal({ users: [] });
    });

    it('should apply minFailures to the in-window failure count', async () => {
      fakeNow();
      const date = new Date('2026-03-10T00:00:00Z').valueOf();
      getDailyFailuresByUserSince.withArgs('2026-05-17').resolves({
        alice: { '2026-06-10': 2 }, // below threshold
        bob: { '2026-06-10': 5 }, // meets threshold
      });
      getLogsForUsers.resolves({ bob: { user: 'bob', date } });
      getDailyFailuresByUserSince.withArgs('2026-03-10').resolves({ bob: { '2026-06-10': 5 } });

      const result = await service.getFailed({ minFailures: 3 });

      // Only the over-threshold user is even looked up.
      expect(getLogsForUsers.args[0][0]).to.deep.equal(['bob']);
      expect(result.users.map(u => u.user)).to.deep.equal(['bob']);
    });

    it('should propagate errors from the failure log query', async () => {
      fakeNow();
      getDailyFailuresByUserSince.rejects({ status: 500 });

      try {
        await service.getFailed();
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ status: 500 });
      }
    });
  });
});
