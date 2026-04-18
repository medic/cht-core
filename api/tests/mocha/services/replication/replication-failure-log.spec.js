const sinon = require('sinon');
const db = require('../../../../src/db');
const replicationFailureLog = require('../../../../src/services/replication/replication-failure-log');

describe('Replication Failure Log Service', () => {
  beforeEach(() => {
    sinon.stub(db.medicLogs, 'allDocs');
    sinon.stub(db.medicLogs, 'get');
    sinon.stub(db.medicLogs, 'put');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('getSummariesByMonth', () => {
    it('should query summaries for the given month without fetching doc bodies', async () => {
      db.medicLogs.allDocs.resolves({ rows: [] });

      const result = await replicationFailureLog.getSummariesByMonth('2026-03');

      expect(db.medicLogs.allDocs.callCount).to.equal(1);
      expect(db.medicLogs.allDocs.args[0][0]).to.deep.equal({
        startkey: 'replication-fail-2026-03-',
        endkey: 'replication-fail-2026-03-\ufff0',
      });
      expect(result).to.deep.equal([]);
    });

    it('should derive user from the doc id and failure count from the rev', async () => {
      db.medicLogs.allDocs.resolves({
        rows: [
          { id: 'replication-fail-2026-04-bob', value: { rev: '5-abc' } },
          { id: 'replication-fail-2026-04-clare', value: { rev: '1-def' } },
          { id: 'replication-fail-2026-04-alice', value: { rev: '123-ghi' } },
        ],
      });

      const result = await replicationFailureLog.getSummariesByMonth('2026-04');

      expect(result).to.deep.equal([
        { _id: 'replication-fail-2026-04-bob', user: 'bob', total_failures: 5 },
        { _id: 'replication-fail-2026-04-clare', user: 'clare', total_failures: 1 },
        { _id: 'replication-fail-2026-04-alice', user: 'alice', total_failures: 123 },
      ]);
    });

    it('should propagate errors', async () => {
      db.medicLogs.allDocs.rejects({ status: 500, message: 'some error' });

      try {
        await replicationFailureLog.getSummariesByMonth('2026-04');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ status: 500, message: 'some error' });
      }
    });
  });

  describe('getForUserAndMonth', () => {
    it('should return the full log document for the given user and month', async () => {
      const doc = {
        _id: 'replication-fail-2026-04-bob',
        _rev: '1-abc',
        type: 'replication-fail',
        user: 'bob',
        timestamp: 1000,
        total_failures: 3,
        failures: [{ status_code: 500 }, { status_code: 500 }, { status_code: 500 }],
      };
      db.medicLogs.get.resolves(doc);

      const result = await replicationFailureLog.getForUserAndMonth('2026-04', 'bob');

      expect(db.medicLogs.get.callCount).to.equal(1);
      expect(db.medicLogs.get.args[0][0]).to.equal('replication-fail-2026-04-bob');
      expect(result).to.deep.equal(doc);
    });

    it('should return null when the log does not exist', async () => {
      db.medicLogs.get.rejects({ status: 404 });

      const result = await replicationFailureLog.getForUserAndMonth('2026-04', 'bob');

      expect(result).to.be.null;
    });

    it('should propagate non-404 errors', async () => {
      db.medicLogs.get.rejects({ status: 500, message: 'db error' });

      try {
        await replicationFailureLog.getForUserAndMonth('2026-04', 'bob');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ status: 500, message: 'db error' });
      }
    });
  });

  describe('getAllForUser', () => {
    it('should list ids without fetching bodies, then return an empty list when nothing matches', async () => {
      db.medicLogs.allDocs.resolves({ rows: [] });

      const result = await replicationFailureLog.getAllForUser('bob');

      expect(db.medicLogs.allDocs.callCount).to.equal(1);
      expect(db.medicLogs.allDocs.args[0][0]).to.deep.equal({
        startkey: 'replication-fail-',
        endkey: 'replication-fail-\ufff0',
      });
      expect(result).to.deep.equal([]);
    });

    it('should fetch bodies only for matching ids', async () => {
      const bobApril = { _id: 'replication-fail-2026-04-bob', user: 'bob', failures: [{}] };
      const bobMay = { _id: 'replication-fail-2026-05-bob', user: 'bob', failures: [{}, {}] };
      db.medicLogs.allDocs.onFirstCall().resolves({
        rows: [
          { id: bobApril._id },
          { id: 'replication-fail-2026-04-clare' },
          { id: bobMay._id },
        ],
      });
      db.medicLogs.allDocs.onSecondCall().resolves({
        rows: [
          { id: bobApril._id, doc: bobApril },
          { id: bobMay._id, doc: bobMay },
        ],
      });

      const result = await replicationFailureLog.getAllForUser('bob');

      expect(db.medicLogs.allDocs.callCount).to.equal(2);
      expect(db.medicLogs.allDocs.args[1][0]).to.deep.equal({
        keys: [bobApril._id, bobMay._id],
        include_docs: true,
      });
      expect(result).to.deep.equal([bobApril, bobMay]);
    });

    it('should not make a second call when no ids match', async () => {
      db.medicLogs.allDocs.resolves({
        rows: [
          { id: 'replication-fail-2026-04-clare' },
          { id: 'replication-fail-2026-04-alice' },
        ],
      });

      const result = await replicationFailureLog.getAllForUser('bob');

      expect(db.medicLogs.allDocs.callCount).to.equal(1);
      expect(result).to.deep.equal([]);
    });

    it('should not match users whose name is a suffix of another username', async () => {
      const bob = { _id: 'replication-fail-2026-04-bob', user: 'bob', failures: [] };
      db.medicLogs.allDocs.onFirstCall().resolves({
        rows: [
          { id: bob._id },
          { id: 'replication-fail-2026-04-sir-bob' },
          { id: 'replication-fail-2026-04-bob2' },
        ],
      });
      db.medicLogs.allDocs.onSecondCall().resolves({
        rows: [{ id: bob._id, doc: bob }],
      });

      const result = await replicationFailureLog.getAllForUser('bob');

      expect(db.medicLogs.allDocs.args[1][0]).to.deep.equal({
        keys: [bob._id],
        include_docs: true,
      });
      expect(result).to.deep.equal([bob]);
    });

    it('should handle usernames that contain dashes', async () => {
      const doc = { _id: 'replication-fail-2026-04-sir-bob', user: 'sir-bob', failures: [] };
      db.medicLogs.allDocs.onFirstCall().resolves({
        rows: [{ id: doc._id }],
      });
      db.medicLogs.allDocs.onSecondCall().resolves({
        rows: [{ id: doc._id, doc }],
      });

      const result = await replicationFailureLog.getAllForUser('sir-bob');

      expect(result).to.deep.equal([doc]);
    });

    it('should propagate errors from the id listing', async () => {
      db.medicLogs.allDocs.rejects({ status: 500, message: 'db error' });

      try {
        await replicationFailureLog.getAllForUser('bob');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ status: 500, message: 'db error' });
      }
    });

    it('should propagate errors from the bulk fetch', async () => {
      db.medicLogs.allDocs.onFirstCall().resolves({
        rows: [{ id: 'replication-fail-2026-04-bob' }],
      });
      db.medicLogs.allDocs.onSecondCall().rejects({ status: 500, message: 'db error' });

      try {
        await replicationFailureLog.getAllForUser('bob');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ status: 500, message: 'db error' });
      }
    });
  });

  describe('capture', () => {
    it('should create a new log when none exists', async () => {
      db.medicLogs.get.rejects({ status: 404 });
      db.medicLogs.put.resolves();

      const userCtx = { name: 'bob', roles: ['district_admin'], subjectsCount: 15 };
      await replicationFailureLog.capture(userCtx, 'req-123', 500, 1200);

      expect(db.medicLogs.put.callCount).to.equal(1);
      const saved = db.medicLogs.put.args[0][0];
      expect(saved.type).to.equal('replication-fail');
      expect(saved.user).to.equal('bob');
      expect(saved.total_failures).to.equal(1);
      expect(saved.failures).to.have.lengthOf(1);
      expect(saved.failures[0].status_code).to.equal(500);
      expect(saved.failures[0].duration).to.equal(1200);
      expect(saved.failures[0].request_id).to.equal('req-123');
      expect(saved.failures[0].subjects_count).to.equal(15);
      expect(saved.failures[0].roles).to.deep.equal(['district_admin']);
      expect(saved.failures[0].timestamp).to.be.a('number');
    });

    it('should append to an existing log', async () => {
      const existingLog = {
        _id: 'replication-fail-2026-04-bob',
        _rev: '1-abc',
        type: 'replication-fail',
        user: 'bob',
        total_failures: 2,
        failures: [
          { timestamp: 1000, status_code: 500, duration: 100, request_id: 'old-1' },
          { timestamp: 2000, status_code: 500, duration: 200, request_id: 'old-2' },
        ],
      };
      db.medicLogs.get.resolves(existingLog);
      db.medicLogs.put.resolves();

      const userCtx = { name: 'bob', roles: ['district_admin'], subjectsCount: 20 };
      await replicationFailureLog.capture(userCtx, 'req-new', 428, 300);

      const saved = db.medicLogs.put.args[0][0];
      expect(saved.total_failures).to.equal(3);
      expect(saved.failures).to.have.lengthOf(3);
      expect(saved.failures[2]).to.deep.include({
        status_code: 428,
        duration: 300,
        request_id: 'req-new',
      });
    });

    it('should cap failures at 50 and keep the most recent', async () => {
      const existingLog = {
        _id: 'replication-fail-2026-04-bob',
        _rev: '1-abc',
        type: 'replication-fail',
        user: 'bob',
        total_failures: 50,
        failures: Array.from({ length: 50 }, (_, i) => ({
          timestamp: i * 1000,
          status_code: 500,
          duration: 100,
          request_id: `old-${i}`,
        })),
      };
      db.medicLogs.get.resolves(existingLog);
      db.medicLogs.put.resolves();

      const userCtx = { name: 'bob', roles: ['district_admin'], subjectsCount: 10 };
      await replicationFailureLog.capture(userCtx, 'req-new', 500, 400);

      const saved = db.medicLogs.put.args[0][0];
      expect(saved.failures).to.have.lengthOf(50);
      expect(saved.total_failures).to.equal(51);
      expect(saved.failures[0].request_id).to.equal('old-1');
      expect(saved.failures[49].request_id).to.equal('req-new');
    });

    it('should not slice when under the cap', async () => {
      const existingLog = {
        _id: 'replication-fail-2026-04-bob',
        _rev: '1-abc',
        type: 'replication-fail',
        user: 'bob',
        total_failures: 10,
        failures: Array.from({ length: 10 }, (_, i) => ({
          timestamp: i * 1000,
          status_code: 500,
          duration: 100,
          request_id: `old-${i}`,
        })),
      };
      db.medicLogs.get.resolves(existingLog);
      db.medicLogs.put.resolves();

      const userCtx = { name: 'bob', roles: ['district_admin'], subjectsCount: 10 };
      await replicationFailureLog.capture(userCtx, 'req-new', 500, 400);

      const saved = db.medicLogs.put.args[0][0];
      expect(saved.failures).to.have.lengthOf(11);
      expect(saved.total_failures).to.equal(11);
      expect(saved.failures[0].request_id).to.equal('old-0');
      expect(saved.failures[10].request_id).to.equal('req-new');
    });

    it('should propagate non-404 db errors from getLog', async () => {
      db.medicLogs.get.rejects({ status: 500, message: 'db error' });

      const userCtx = { name: 'bob', roles: ['district_admin'] };
      await expect(
        replicationFailureLog.capture(userCtx, 'req-123', 500, 100)
      ).to.be.rejectedWith('db error');
    });

    it('should propagate put errors', async () => {
      db.medicLogs.get.rejects({ status: 404 });
      db.medicLogs.put.rejects({ status: 409, message: 'conflict' });

      const userCtx = { name: 'bob', roles: ['district_admin'] };

      await expect(
        replicationFailureLog.capture(userCtx, 'req-123', 402, 200)
      ).to.be.rejectedWith('conflict');
    });
  });
});
