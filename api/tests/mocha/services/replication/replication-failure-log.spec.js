const sinon = require('sinon');
const moment = require('moment');
const db = require('../../../../src/db');
const replicationFailureLog = require('../../../../src/services/replication/replication-failure-log');
const pagination = require('../../../../src/services/pagination');

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

        expect(db.medicLogs.get.callCount).to.equal(1);
        expect(db.medicLogs.get.args[0][0]).to.equal('replication-fail-2026-04-bob');
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
        expect(db.medicLogs.get.callCount).to.equal(1);
        expect(db.medicLogs.get.args[0][0]).to.equal('replication-fail-2026-04-bob');
      });
    });

    describe('with reportingPeriod only', () => {
      it('should fetch the page directly with native skip/limit and return a next-page cursor', async () => {
        const doc = { _id: 'replication-fail-2026-04-bob', user: 'bob', failures: [] };
        const trailing = { _id: 'replication-fail-2026-04-clare', user: 'clare', failures: [] };
        // Service requests `limit + 1` rows; the trailing row signals "there is a next page" and
        // gets sliced off before returning to the caller.
        db.medicLogs.allDocs.resolves({
          rows: [{ id: doc._id, doc }, { id: trailing._id, doc: trailing }],
        });

        const result = await replicationFailureLog.get({ reportingPeriod: '2026-04', cursor: 1, limit: 1 });

        expect(db.medicLogs.allDocs.callCount).to.equal(1);
        expect(db.medicLogs.allDocs.args[0][0]).to.deep.equal({
          startkey: 'replication-fail-2026-04-',
          endkey: 'replication-fail-2026-04-\ufff0',
          skip: 1,
          limit: 2,
          include_docs: true,
        });
        expect(result).to.deep.equal({ data: [doc], cursor: '2' });
      });

      it('should return cursor=null when the page is partial (last page)', async () => {
        const docs = [
          { _id: 'replication-fail-2026-04-alice', user: 'alice', failures: [] },
          { _id: 'replication-fail-2026-04-bob', user: 'bob', failures: [] },
        ];
        db.medicLogs.allDocs.resolves({ rows: docs.map(doc => ({ id: doc._id, doc })) });

        const result = await replicationFailureLog.get({ reportingPeriod: '2026-04', cursor: 0, limit: 5 });

        expect(db.medicLogs.allDocs.callCount).to.equal(1);
        expect(db.medicLogs.allDocs.args[0][0]).to.deep.equal({
          startkey: 'replication-fail-2026-04-',
          endkey: 'replication-fail-2026-04-\ufff0',
          skip: 0,
          limit: 6,
          include_docs: true,
        });
        expect(result).to.deep.equal({ data: docs, cursor: null });
      });
    });

    describe('with user only', () => {
      beforeEach(() => sinon.useFakeTimers(new Date('2026-04-15T12:00:00Z').valueOf()));

      const candidateKeysFor = (user) => {
        const start = moment('2021-04', 'YYYY-MM');
        return Array.from(
          { length: 61 },
          (_, i) => `replication-fail-${start.clone().add(i, 'month').format('YYYY-MM')}-${user}`
        );
      };
      const rowsFor = (user, docsById) => candidateKeysFor(user).map(key => (
        docsById.has(key) ? { id: key, doc: docsById.get(key) } : { key, error: 'not_found' }
      ));

      it('should bulk-fetch the user\'s candidate keys and return the matched docs', async () => {
        const bobApril = { _id: 'replication-fail-2026-04-bob', user: 'bob', failures: [{}] };
        db.medicLogs.allDocs.resolves({ rows: rowsFor('bob', new Map([[bobApril._id, bobApril]])) });

        const result = await replicationFailureLog.get({ user: 'bob' });

        expect(db.medicLogs.allDocs.callCount).to.equal(1);
        expect(db.medicLogs.allDocs.args[0][0]).to.deep.equal({
          keys: candidateKeysFor('bob'),
          include_docs: true,
        });
        expect(result).to.deep.equal({ data: [bobApril], cursor: null });
      });

      it('should apply cursor + limit after filtering and surface the next-page cursor', async () => {
        const docs = [
          { _id: 'replication-fail-2026-01-bob' },
          { _id: 'replication-fail-2026-02-bob' },
          { _id: 'replication-fail-2026-03-bob' },
          { _id: 'replication-fail-2026-04-bob' },
        ];
        db.medicLogs.allDocs.resolves({ rows: rowsFor('bob', new Map(docs.map(d => [d._id, d]))) });

        const result = await replicationFailureLog.get({ user: 'bob', cursor: 1, limit: 2 });

        expect(result.data.map(doc => doc._id)).to.deep.equal([
          'replication-fail-2026-02-bob',
          'replication-fail-2026-03-bob',
        ]);
        expect(result.cursor).to.equal('3');
      });

      it('should return an empty page when the user has no logs in the lookback window', async () => {
        db.medicLogs.allDocs.resolves({ rows: rowsFor('bob', new Map()) });

        const result = await replicationFailureLog.get({ user: 'bob' });

        expect(db.medicLogs.allDocs.callCount).to.equal(1);
        expect(result).to.deep.equal({ data: [], cursor: null });
      });

      it('should handle usernames that contain dashes', async () => {
        const doc = { _id: 'replication-fail-2026-04-sir-bob', user: 'sir-bob', failures: [] };
        db.medicLogs.allDocs.resolves({ rows: rowsFor('sir-bob', new Map([[doc._id, doc]])) });

        const result = await replicationFailureLog.get({ user: 'sir-bob' });

        expect(db.medicLogs.allDocs.args[0][0]).to.deep.equal({
          keys: candidateKeysFor('sir-bob'),
          include_docs: true,
        });
        expect(result).to.deep.equal({ data: [doc], cursor: null });
      });

      it('should return all matches in a single page on a long-running instance', async () => {
        const docs = candidateKeysFor('bob').map(id => ({ _id: id, user: 'bob', failures: [] }));
        db.medicLogs.allDocs.resolves({ rows: docs.map(doc => ({ id: doc._id, doc })) });

        const result = await replicationFailureLog.get({ user: 'bob' });

        expect(db.medicLogs.allDocs.callCount).to.equal(1);
        expect(result.data).to.have.lengthOf(61);
        expect(result.data).to.deep.equal(docs);
        expect(result.cursor).to.equal(null);
      });
    });

    describe('with no filters', () => {
      it('should fetch the page directly with native skip/limit and return cursor=null on a partial page', async () => {
        const docs = [
          { _id: 'replication-fail-2026-03-alice', user: 'alice', failures: [] },
          { _id: 'replication-fail-2026-04-bob', user: 'bob', failures: [] },
        ];
        db.medicLogs.allDocs.resolves({ rows: docs.map(doc => ({ id: doc._id, doc })) });

        const result = await replicationFailureLog.get();

        expect(db.medicLogs.allDocs.callCount).to.equal(1);
        expect(db.medicLogs.allDocs.args[0][0]).to.deep.equal({
          startkey: 'replication-fail-',
          endkey: 'replication-fail-\ufff0',
          skip: 0,
          limit: 101,
          include_docs: true,
        });
        expect(result).to.deep.equal({ data: docs, cursor: null });
      });

      it('should honor custom cursor and limit and return the next-page cursor on a full page', async () => {
        const doc = { _id: 'replication-fail-2026-04-bob' };
        const trailing = { _id: 'replication-fail-2026-04-clare' };
        // limit+1 = 2 rows fetched; the trailing row signals "next page exists" and is sliced off.
        db.medicLogs.allDocs.resolves({
          rows: [{ id: doc._id, doc }, { id: trailing._id, doc: trailing }],
        });

        const result = await replicationFailureLog.get({ cursor: 1, limit: 1 });

        expect(db.medicLogs.allDocs.callCount).to.equal(1);
        expect(db.medicLogs.allDocs.args[0][0]).to.deep.equal({
          startkey: 'replication-fail-',
          endkey: 'replication-fail-\ufff0',
          skip: 1,
          limit: 2,
          include_docs: true,
        });
        expect(result.data).to.deep.equal([doc]);
        expect(result.cursor).to.equal('2');
      });

      it('should return a default-limit full page with a next-page cursor', async () => {
        // Fixture returns DEFAULT_LIMIT+1 docs so the service can detect a non-final page.
        const allDocs = Array.from({ length: pagination.DEFAULT_LIMIT + 1 }, (_, i) => ({
          _id: `replication-fail-2026-04-user-${String(i).padStart(3, '0')}`,
          user: `user-${i}`,
          failures: [],
        }));
        const pageDocs = allDocs.slice(0, pagination.DEFAULT_LIMIT);
        db.medicLogs.allDocs.resolves({ rows: allDocs.map(doc => ({ id: doc._id, doc })) });

        const result = await replicationFailureLog.get();

        expect(db.medicLogs.allDocs.callCount).to.equal(1);
        expect(db.medicLogs.allDocs.args[0][0]).to.deep.equal({
          startkey: 'replication-fail-',
          endkey: 'replication-fail-\ufff0',
          skip: 0,
          limit: pagination.DEFAULT_LIMIT + 1,
          include_docs: true,
        });
        expect(result.data).to.deep.equal(pageDocs);
        expect(result.cursor).to.equal(String(pagination.DEFAULT_LIMIT));
      });

      it('should propagate errors', async () => {
        db.medicLogs.allDocs.rejects({ status: 500, message: 'db error' });

        try {
          await replicationFailureLog.get();
          expect.fail('should have thrown');
        } catch (err) {
          expect(err).to.deep.equal({ status: 500, message: 'db error' });
        }
        expect(db.medicLogs.allDocs.callCount).to.equal(1);
        expect(db.medicLogs.allDocs.args[0][0]).to.deep.equal({
          startkey: 'replication-fail-',
          endkey: 'replication-fail-\ufff0',
          skip: 0,
          limit: pagination.DEFAULT_LIMIT + 1,
          include_docs: true,
        });
      });
    });
  });

  describe('capture', () => {
    it('should create a new log when none exists', async () => {
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
      expect(saved.failures[0]).to.deep.equal({ date: 1000, status_code: 500, duration: 100, request_id: 'old-1' });
      expect(saved.failures[1]).to.deep.equal({ date: 2000, status_code: 500, duration: 200, request_id: 'old-2' });
      expect(saved.failures[2]).to.deep.include({
        status_code: 428,
        duration: 300,
        request_id: 'req-new',
      });
    });

    it('should cap failures at 50 and keep the most recent', async () => {
      const oldFailures = Array.from({ length: 50 }, (_, i) => ({
        date: i * 1000,
        status_code: 500,
        duration: 100,
        request_id: `old-${i}`,
      }));
      const existingLog = {
        _id: 'replication-fail-2026-04-bob',
        _rev: '1-abc',
        user: 'bob',
        total_failures: 50,
        failures: oldFailures.map(f => ({ ...f })),
      };
      db.medicLogs.get.resolves(existingLog);
      db.medicLogs.put.resolves();

      const userCtx = { name: 'bob', roles: ['chw'], subjectsCount: 10 };
      await replicationFailureLog.capture(userCtx, 'req-new', 500, 400);

      const saved = db.medicLogs.put.args[0][0];
      expect(saved.failures).to.have.lengthOf(50);
      expect(saved.total_failures).to.equal(51);
      // The oldest entry (`old-0`) is dropped; the remaining 49 prior entries are unchanged.
      expect(saved.failures.slice(0, 49)).to.deep.equal(oldFailures.slice(1));
      expect(saved.failures[49]).to.deep.include({
        status_code: 500,
        duration: 400,
        request_id: 'req-new',
      });
    });

    it('should not slice when under the cap', async () => {
      const oldFailures = Array.from({ length: 10 }, (_, i) => ({
        date: i * 1000,
        status_code: 500,
        duration: 100,
        request_id: `old-${i}`,
      }));
      const existingLog = {
        _id: 'replication-fail-2026-04-bob',
        _rev: '1-abc',
        user: 'bob',
        total_failures: 10,
        failures: oldFailures.map(f => ({ ...f })),
      };
      db.medicLogs.get.resolves(existingLog);
      db.medicLogs.put.resolves();

      const userCtx = { name: 'bob', roles: ['chw'], subjectsCount: 10 };
      await replicationFailureLog.capture(userCtx, 'req-new', 500, 400);

      const saved = db.medicLogs.put.args[0][0];
      expect(saved.failures).to.have.lengthOf(11);
      expect(saved.total_failures).to.equal(11);
      expect(saved.failures.slice(0, 10)).to.deep.equal(oldFailures);
      expect(saved.failures[10]).to.deep.include({
        status_code: 500,
        duration: 400,
        request_id: 'req-new',
      });
    });

    it('should propagate non-404 db errors from getLog', async () => {
      sinon.useFakeTimers(new Date('2026-04-15T12:00:00Z').valueOf());
      db.medicLogs.get.rejects({ status: 500, message: 'db error' });

      const userCtx = { name: 'bob', roles: ['chw'] };
      await expect(
        replicationFailureLog.capture(userCtx, 'req-123', 500, 100)
      ).to.be.rejectedWith('db error');

      expect(db.medicLogs.get.callCount).to.equal(1);
      expect(db.medicLogs.get.args[0][0]).to.equal('replication-fail-2026-04-bob');
      expect(db.medicLogs.put.callCount).to.equal(0);
    });

    it('should propagate put errors', async () => {
      const now = new Date('2026-04-15T12:00:00Z').valueOf();
      sinon.useFakeTimers(now);
      db.medicLogs.get.rejects({ status: 404 });
      db.medicLogs.put.rejects({ status: 409, message: 'conflict' });

      const userCtx = { name: 'bob', roles: ['chw'] };

      await expect(
        replicationFailureLog.capture(userCtx, 'req-123', 402, 200)
      ).to.be.rejectedWith('conflict');

      expect(db.medicLogs.get.callCount).to.equal(1);
      expect(db.medicLogs.get.args[0][0]).to.equal('replication-fail-2026-04-bob');
      expect(db.medicLogs.put.callCount).to.equal(1);
      expect(db.medicLogs.put.args[0][0]).to.deep.equal({
        _id: 'replication-fail-2026-04-bob',
        user: 'bob',
        date: now,
        total_failures: 1,
        failures: [{
          date: now,
          status_code: 402,
          duration: 200,
          request_id: 'req-123',
          subjects_count: 'unknown',
          docs_count: 'unknown',
          unpurged_docs_count: 'unknown',
          roles: ['chw'],
        }],
      });
    });
  });
});
