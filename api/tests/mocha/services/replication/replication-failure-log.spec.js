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

  describe('get', () => {
    describe('with user and reportingPeriod', () => {
      it('should fetch the specific doc with cursor=null', async () => {
        const doc = { _id: 'replication-fail-2026-04-bob', user: 'bob', failures: [{}] };
        db.medicLogs.get.resolves(doc);

        const result = await replicationFailureLog.get({ user: 'bob', reportingPeriod: '2026-04' });

        expect(db.medicLogs.get.callCount).to.equal(1);
        expect(db.medicLogs.get.args[0][0]).to.equal('replication-fail-2026-04-bob');
        expect(result).to.deep.equal({ data: [doc], cursor: null });
      });

      it('should return an empty data list with cursor=null when the doc does not exist', async () => {
        db.medicLogs.get.rejects({ status: 404 });

        const result = await replicationFailureLog.get({ user: 'bob', reportingPeriod: '2026-04' });

        expect(result).to.deep.equal({ data: [], cursor: null });
      });

      it('should propagate non-404 errors', async () => {
        db.medicLogs.get.rejects({ status: 500, message: 'db error' });

        try {
          await replicationFailureLog.get({ user: 'bob', reportingPeriod: '2026-04' });
          expect.fail('should have thrown');
        } catch (err) {
          expect(err).to.deep.equal({ status: 500, message: 'db error' });
        }
      });
    });

    describe('cursor validation', () => {
      it('should reject a non-string cursor', async () => {
        await expect(replicationFailureLog.get({ cursor: 1 })).to.be.rejectedWith(
          /cursor must be a string or null/
        );
      });

      it('should reject a non-numeric cursor', async () => {
        await expect(replicationFailureLog.get({ cursor: 'abc' })).to.be.rejectedWith(
          /cursor must be a string or null/
        );
      });

      it('should reject a negative cursor', async () => {
        await expect(replicationFailureLog.get({ cursor: '-1' })).to.be.rejectedWith(
          /cursor must be a string or null/
        );
      });

      it('should reject a non-integer cursor', async () => {
        await expect(replicationFailureLog.get({ cursor: '1.5' })).to.be.rejectedWith(
          /cursor must be a string or null/
        );
      });
    });

    describe('with reportingPeriod only', () => {
      it('should list the period\'s ids, then bulk-fetch the page, returning a next-page cursor', async () => {
        const docs = [
          { _id: 'replication-fail-2026-04-alice', user: 'alice', failures: [] },
          { _id: 'replication-fail-2026-04-bob', user: 'bob', failures: [] },
          { _id: 'replication-fail-2026-04-clare', user: 'clare', failures: [] },
        ];
        db.medicLogs.allDocs.onFirstCall().resolves({
          rows: docs.map(doc => ({ id: doc._id })),
        });
        db.medicLogs.allDocs.onSecondCall().resolves({
          rows: [{ id: docs[1]._id, doc: docs[1] }],
        });

        const result = await replicationFailureLog.get({ reportingPeriod: '2026-04', cursor: '1', limit: 1 });

        expect(db.medicLogs.allDocs.callCount).to.equal(2);
        expect(db.medicLogs.allDocs.args[0][0]).to.deep.equal({
          startkey: 'replication-fail-2026-04-',
          endkey: 'replication-fail-2026-04-￰',
        });
        expect(db.medicLogs.allDocs.args[1][0]).to.deep.equal({
          keys: [docs[1]._id],
          include_docs: true,
        });
        // cursor is the offset of the next unfetched id (1 + 1 = 2), since there's still 1 more
        expect(result).to.deep.equal({ data: [docs[1]], cursor: '2' });
      });

      it('should return cursor=null on the last page', async () => {
        const docs = [
          { _id: 'replication-fail-2026-04-alice', user: 'alice', failures: [] },
          { _id: 'replication-fail-2026-04-bob', user: 'bob', failures: [] },
        ];
        db.medicLogs.allDocs.onFirstCall().resolves({
          rows: docs.map(doc => ({ id: doc._id })),
        });
        db.medicLogs.allDocs.onSecondCall().resolves({
          rows: [{ id: docs[1]._id, doc: docs[1] }],
        });

        const result = await replicationFailureLog.get({ reportingPeriod: '2026-04', cursor: '1', limit: 1 });

        expect(result).to.deep.equal({ data: [docs[1]], cursor: null });
      });
    });

    describe('with user only', () => {
      it('should filter ids by user, paginate, and bulk-fetch the page', async () => {
        const bobApril = { _id: 'replication-fail-2026-04-bob', user: 'bob', failures: [{}] };
        const bobMay = { _id: 'replication-fail-2026-05-bob', user: 'bob', failures: [{}, {}] };
        db.medicLogs.allDocs.onFirstCall().resolves({
          rows: [
            { id: bobApril._id },
            { id: 'replication-fail-2026-04-clare' },
            { id: bobMay._id },
            { id: 'replication-fail-2026-04-bob2' },
          ],
        });
        db.medicLogs.allDocs.onSecondCall().resolves({
          rows: [
            { id: bobApril._id, doc: bobApril },
            { id: bobMay._id, doc: bobMay },
          ],
        });

        const result = await replicationFailureLog.get({ user: 'bob' });

        expect(db.medicLogs.allDocs.callCount).to.equal(2);
        expect(db.medicLogs.allDocs.args[0][0]).to.deep.equal({
          startkey: 'replication-fail-',
          endkey: 'replication-fail-￰',
        });
        expect(db.medicLogs.allDocs.args[1][0]).to.deep.equal({
          keys: [bobApril._id, bobMay._id],
          include_docs: true,
        });
        expect(result).to.deep.equal({ data: [bobApril, bobMay], cursor: null });
      });

      it('should apply cursor + limit after filtering and surface the next-page cursor', async () => {
        db.medicLogs.allDocs.onFirstCall().resolves({
          rows: [
            { id: 'replication-fail-2026-01-bob' },
            { id: 'replication-fail-2026-02-bob' },
            { id: 'replication-fail-2026-03-bob' },
            { id: 'replication-fail-2026-04-bob' },
          ],
        });
        db.medicLogs.allDocs.onSecondCall().resolves({
          rows: [
            { id: 'replication-fail-2026-02-bob', doc: { _id: 'replication-fail-2026-02-bob' } },
            { id: 'replication-fail-2026-03-bob', doc: { _id: 'replication-fail-2026-03-bob' } },
          ],
        });

        const result = await replicationFailureLog.get({ user: 'bob', cursor: '1', limit: 2 });

        expect(db.medicLogs.allDocs.args[1][0]).to.deep.equal({
          keys: ['replication-fail-2026-02-bob', 'replication-fail-2026-03-bob'],
          include_docs: true,
        });
        expect(result.data.map(doc => doc._id)).to.deep.equal([
          'replication-fail-2026-02-bob',
          'replication-fail-2026-03-bob',
        ]);
        // 1 + 2 = 3 < 4 total filtered ids, so there's still one more page
        expect(result.cursor).to.equal('3');
      });

      it('should not make a second call when no ids match', async () => {
        db.medicLogs.allDocs.resolves({
          rows: [{ id: 'replication-fail-2026-04-alice' }],
        });

        const result = await replicationFailureLog.get({ user: 'bob' });

        expect(db.medicLogs.allDocs.callCount).to.equal(1);
        expect(result).to.deep.equal({ data: [], cursor: null });
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

        const result = await replicationFailureLog.get({ user: 'bob' });

        expect(db.medicLogs.allDocs.args[1][0]).to.deep.equal({
          keys: [bob._id],
          include_docs: true,
        });
        expect(result).to.deep.equal({ data: [bob], cursor: null });
      });

      it('should handle usernames that contain dashes', async () => {
        const doc = { _id: 'replication-fail-2026-04-sir-bob', user: 'sir-bob', failures: [] };
        db.medicLogs.allDocs.onFirstCall().resolves({ rows: [{ id: doc._id }] });
        db.medicLogs.allDocs.onSecondCall().resolves({ rows: [{ id: doc._id, doc }] });

        const result = await replicationFailureLog.get({ user: 'sir-bob' });

        expect(result).to.deep.equal({ data: [doc], cursor: null });
      });
    });

    describe('with no filters', () => {
      it('should list all ids, fetch the page and return cursor=null when there is no next page', async () => {
        const docs = [
          { _id: 'replication-fail-2026-03-alice', user: 'alice', failures: [] },
          { _id: 'replication-fail-2026-04-bob', user: 'bob', failures: [] },
        ];
        db.medicLogs.allDocs.onFirstCall().resolves({
          rows: docs.map(doc => ({ id: doc._id })),
        });
        db.medicLogs.allDocs.onSecondCall().resolves({
          rows: docs.map(doc => ({ id: doc._id, doc })),
        });

        const result = await replicationFailureLog.get();

        expect(db.medicLogs.allDocs.callCount).to.equal(2);
        expect(db.medicLogs.allDocs.args[0][0]).to.deep.equal({
          startkey: 'replication-fail-',
          endkey: 'replication-fail-\ufff0',
        });
        expect(db.medicLogs.allDocs.args[1][0]).to.deep.equal({
          keys: docs.map(doc => doc._id),
          include_docs: true,
        });
        expect(result).to.deep.equal({ data: docs, cursor: null });
      });

      it('should honor custom cursor and limit and return the next-page cursor', async () => {
        db.medicLogs.allDocs.onFirstCall().resolves({
          rows: [
            { id: 'replication-fail-2026-03-alice' },
            { id: 'replication-fail-2026-04-bob' },
            { id: 'replication-fail-2026-04-clare' },
          ],
        });
        db.medicLogs.allDocs.onSecondCall().resolves({
          rows: [{ id: 'replication-fail-2026-04-bob', doc: { _id: 'replication-fail-2026-04-bob' } }],
        });

        const result = await replicationFailureLog.get({ cursor: '1', limit: 1 });

        expect(db.medicLogs.allDocs.args[1][0]).to.deep.equal({
          keys: ['replication-fail-2026-04-bob'],
          include_docs: true,
        });
        expect(result.data).to.have.lengthOf(1);
        expect(result.cursor).to.equal('2');
      });

      it('should propagate errors', async () => {
        db.medicLogs.allDocs.rejects({ status: 500, message: 'db error' });

        try {
          await replicationFailureLog.get();
          expect.fail('should have thrown');
        } catch (err) {
          expect(err).to.deep.equal({ status: 500, message: 'db error' });
        }
      });
    });
  });

  describe('capture', () => {
    it('should create a new log when none exists', async () => {
      // Freeze time so we can assert the exact log shape (including `date` and the YYYY-MM in `_id`).
      // Use mid-month UTC so timezone offsets don't drift the formatted month.
      const now = new Date('2026-04-15T12:00:00Z').valueOf();
      sinon.useFakeTimers(now);

      db.medicLogs.get.rejects({ status: 404 });
      db.medicLogs.put.resolves();

      const userCtx = {
        name: 'bob',
        roles: ['chw'],
        subjectsCount: 15,
        docsCount: 1234,
        unpurgedDocsCount: 1200,
      };
      await replicationFailureLog.capture(userCtx, 'req-123', 500, 1200);

      expect(db.medicLogs.put.callCount).to.equal(1);
      expect(db.medicLogs.put.args[0][0]).to.deep.equal({
        _id: 'replication-fail-2026-04-bob',
        user: 'bob',
        date: now,
        total_failures: 1,
        failures: [{
          date: now,
          status_code: 500,
          duration: 1200,
          request_id: 'req-123',
          subjects_count: 15,
          docs_count: 1234,
          unpurged_docs_count: 1200,
          roles: ['chw'],
        }],
      });
    });

    it('should record `unknown` for counts not set on userCtx', async () => {
      db.medicLogs.get.rejects({ status: 404 });
      db.medicLogs.put.resolves();

      // Simulates a failure before getAuthorizationContext ran — none of the counters were set.
      const userCtx = { name: 'bob', roles: ['chw'] };
      await replicationFailureLog.capture(userCtx, 'req-early', 500, 50);

      const saved = db.medicLogs.put.args[0][0];
      expect(saved.failures[0].subjects_count).to.equal('unknown');
      expect(saved.failures[0].docs_count).to.equal('unknown');
      expect(saved.failures[0].unpurged_docs_count).to.equal('unknown');
    });

    it('should mix numeric counters with `unknown` based on how far the request progressed', async () => {
      db.medicLogs.get.rejects({ status: 404 });
      db.medicLogs.put.resolves();

      // Simulates a failure during the purge step — subjects + docs counts are set, unpurged is not.
      const userCtx = {
        name: 'bob',
        roles: ['chw'],
        subjectsCount: 6,
        docsCount: 1234,
      };
      await replicationFailureLog.capture(userCtx, 'req-mid', 500, 200);

      const saved = db.medicLogs.put.args[0][0];
      expect(saved.failures[0].subjects_count).to.equal(6);
      expect(saved.failures[0].docs_count).to.equal(1234);
      expect(saved.failures[0].unpurged_docs_count).to.equal('unknown');
    });

    it('should append to an existing log', async () => {
      const existingLog = {
        _id: 'replication-fail-2026-04-bob',
        _rev: '1-abc',
        user: 'bob',
        total_failures: 2,
        failures: [
          { date: 1000, status_code: 500, duration: 100, request_id: 'old-1' },
          { date: 2000, status_code: 500, duration: 200, request_id: 'old-2' },
        ],
      };
      db.medicLogs.get.resolves(existingLog);
      db.medicLogs.put.resolves();

      const userCtx = { name: 'bob', roles: ['chw'], subjectsCount: 20 };
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
        user: 'bob',
        total_failures: 50,
        failures: Array.from({ length: 50 }, (_, i) => ({
          date: i * 1000,
          status_code: 500,
          duration: 100,
          request_id: `old-${i}`,
        })),
      };
      db.medicLogs.get.resolves(existingLog);
      db.medicLogs.put.resolves();

      const userCtx = { name: 'bob', roles: ['chw'], subjectsCount: 10 };
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
        user: 'bob',
        total_failures: 10,
        failures: Array.from({ length: 10 }, (_, i) => ({
          date: i * 1000,
          status_code: 500,
          duration: 100,
          request_id: `old-${i}`,
        })),
      };
      db.medicLogs.get.resolves(existingLog);
      db.medicLogs.put.resolves();

      const userCtx = { name: 'bob', roles: ['chw'], subjectsCount: 10 };
      await replicationFailureLog.capture(userCtx, 'req-new', 500, 400);

      const saved = db.medicLogs.put.args[0][0];
      expect(saved.failures).to.have.lengthOf(11);
      expect(saved.total_failures).to.equal(11);
      expect(saved.failures[0].request_id).to.equal('old-0');
      expect(saved.failures[10].request_id).to.equal('req-new');
    });

    it('should propagate non-404 db errors from getLog', async () => {
      db.medicLogs.get.rejects({ status: 500, message: 'db error' });

      const userCtx = { name: 'bob', roles: ['chw'] };
      await expect(
        replicationFailureLog.capture(userCtx, 'req-123', 500, 100)
      ).to.be.rejectedWith('db error');
    });

    it('should propagate put errors', async () => {
      db.medicLogs.get.rejects({ status: 404 });
      db.medicLogs.put.rejects({ status: 409, message: 'conflict' });

      const userCtx = { name: 'bob', roles: ['chw'] };

      await expect(
        replicationFailureLog.capture(userCtx, 'req-123', 402, 200)
      ).to.be.rejectedWith('conflict');
    });
  });
});
