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

  describe('getByMonth', () => {
    it('should query logs for the given month', async () => {
      db.medicLogs.allDocs.resolves({ rows: [] });

      const result = await replicationFailureLog.getByMonth('2026-03');

      expect(db.medicLogs.allDocs.callCount).to.equal(1);
      expect(db.medicLogs.allDocs.args[0][0]).to.deep.equal({
        startkey: 'replication-fail-2026-03-',
        endkey: 'replication-fail-2026-03-\ufff0',
        include_docs: true,
      });
      expect(result).to.deep.equal([]);
    });

    it('should return docs from matching rows', async () => {
      const docs = [
        { _id: 'replication-fail-2026-04-bob', user: 'bob', failures: [{ status_code: 500 }] },
        { _id: 'replication-fail-2026-04-clare', user: 'clare', failures: [] },
      ];
      db.medicLogs.allDocs.resolves({
        rows: docs.map(doc => ({ id: doc._id, doc })),
      });

      const result = await replicationFailureLog.getByMonth('2026-04');

      expect(result).to.deep.equal(docs);
    });

    it('should propagate errors', async () => {
      db.medicLogs.allDocs.rejects({ status: 500, message: 'some error' });

      try {
        await replicationFailureLog.getByMonth('2026-04');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ status: 500, message: 'some error' });
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
