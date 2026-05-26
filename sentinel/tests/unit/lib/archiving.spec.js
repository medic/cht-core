const chai = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');

const db = require('../../../src/db');

const job = (props = {}) => Object.assign({
  _id: 'archive:2026-05-18T00:00:00.000Z:uuid',
  _rev: '1-a',
  total: 0,
  cursor: 0,
}, props);

// allDocs / put / get fakes that walk a queue: allDocs returns the first non-deleted
// doc as rows[0], get returns the live doc (404 if deleted), put with _deleted flips
// the queue flag so subsequent allDocs / get behave like the doc is gone.
const stubQueue = (jobs) => {
  const queue = jobs.map(j => ({ ...j }));
  const putSnapshots = [];
  let revCounter = 0;

  sinon.stub(db.sentinel, 'allDocs').callsFake(() => {
    const next = queue.find(j => !j._deleted);
    return Promise.resolve({ rows: next ? [{ doc: next }] : [] });
  });

  sinon.stub(db.sentinel, 'get').callsFake(id => {
    const target = queue.find(j => j._id === id);
    if (!target || target._deleted) {
      return Promise.reject(Object.assign(new Error('not_found'), { status: 404 }));
    }
    return Promise.resolve({ ...target });
  });

  sinon.stub(db.sentinel, 'put').callsFake(doc => {
    putSnapshots.push({ ...doc });
    const target = queue.find(j => j._id === doc._id);
    const newRev = `${++revCounter}-x`;
    if (doc._deleted) {
      if (target) {
        target._deleted = true;
      }
    } else if (target) {
      Object.assign(target, doc, { _rev: newRev });
    }
    return Promise.resolve({ id: doc._id, rev: newRev });
  });

  return { queue, putSnapshots };
};

describe('Sentinel archiving lib', () => {
  let lib;

  beforeEach(() => {
    lib = rewire('../../../src/lib/archiving');
    // Disable archiveBatch and indexViews by default — the queue stubs don't model the
    // medic / archive dbs or _purge, and most tests just want to observe the loop.
    lib.__set__('archiveBatch', sinon.stub().resolves());
    lib.__set__('indexViews', sinon.stub().resolves());
  });

  afterEach(() => sinon.restore());

  it('scans the archive: prefix range with limit:1 to find the next job', async () => {
    sinon.stub(db.sentinel, 'allDocs').resolves({ rows: [] });

    await lib.archive();

    chai.expect(db.sentinel.allDocs.callCount).to.equal(1);
    chai.expect(db.sentinel.allDocs.args[0][0]).to.deep.equal({
      startkey: 'archive:',
      endkey: 'archive:\ufff0',
      include_docs: true,
      limit: 1,
    });
  });

  it('processes a job in batches and deletes the doc when cursor reaches total', async () => {
    const pending = job({ _id: 'archive:1', total: 5 });
    const { queue, putSnapshots } = stubQueue([pending]);
    sinon.stub(db.sentinel, 'getAttachment').resolves(Buffer.from('a\nb\nc\nd\ne', 'utf8'));
    lib.__set__('BATCH_SIZE', 2);

    const archiveBatch = sinon.stub().resolves();
    lib.__set__('archiveBatch', archiveBatch);

    await lib.archive();

    chai.expect(archiveBatch.callCount).to.equal(3);
    chai.expect(archiveBatch.args[0][0]).to.deep.equal(['a', 'b']);
    chai.expect(archiveBatch.args[1][0]).to.deep.equal(['c', 'd']);
    chai.expect(archiveBatch.args[2][0]).to.deep.equal(['e']);

    // Three saveJob calls: two intermediate puts (cursor 2, cursor 4), then one delete put.
    chai.expect(putSnapshots).to.have.lengthOf(3);
    chai.expect(putSnapshots[0]).to.include({ cursor: 2 });
    chai.expect(putSnapshots[0]._deleted).to.not.equal(true);
    chai.expect(putSnapshots[1]).to.include({ cursor: 4 });
    chai.expect(putSnapshots[1]._deleted).to.not.equal(true);
    chai.expect(putSnapshots[2]).to.include({ _id: 'archive:1', _deleted: true });
    chai.expect(queue[0]._deleted).to.equal(true);
  });

  it('appends a {date, cursor} entry to history on every saveJob, including across cycles', async () => {
    const pending = job({ _id: 'archive:1', total: 4 });
    const { queue, putSnapshots } = stubQueue([pending]);
    sinon.stub(db.sentinel, 'getAttachment').resolves(Buffer.from('a\nb\nc\nd', 'utf8'));
    lib.__set__('BATCH_SIZE', 2);

    let clock = 1000;
    const nowStub = sinon.stub(Date, 'now').callsFake(() => clock);
    const archiveBatch = sinon.stub().callsFake(() => {
      clock += 10;
    });
    lib.__set__('archiveBatch', archiveBatch);

    await lib.archive();

    // Two saveJob calls: cursor 2 (mid-job), cursor 4 (last batch, also deletes).
    // After both saves, the job's history holds one entry per saveJob.
    chai.expect(putSnapshots).to.have.lengthOf(2);
    chai.expect(queue[0].history).to.deep.equal([
      { date: 1010, cursor: 2 },
      { date: 1020, cursor: 4 },
    ]);
    nowStub.restore();
  });

  it('preserves prior-cycle history when resuming a job that was already partially saved', async () => {
    const earlierHistory = [{ date: 500, cursor: 1 }];
    const resuming = job({ _id: 'archive:1', total: 3, cursor: 1, history: [...earlierHistory] });
    const { queue, putSnapshots } = stubQueue([resuming]);
    sinon.stub(db.sentinel, 'getAttachment').resolves(Buffer.from('a\nb\nc', 'utf8'));
    lib.__set__('BATCH_SIZE', 10);

    let clock = 2000;
    sinon.stub(Date, 'now').callsFake(() => clock);
    const archiveBatch = sinon.stub().callsFake(() => {
      clock += 5;
    });
    lib.__set__('archiveBatch', archiveBatch);

    await lib.archive();

    chai.expect(putSnapshots[0].history).to.deep.equal([
      ...earlierHistory,
      { date: 2005, cursor: 3 },
    ]);
    chai.expect(queue[0].history).to.deep.equal([
      ...earlierHistory,
      { date: 2005, cursor: 3 },
    ]);
  });

  it('resumes a job from its existing cursor', async () => {
    const resuming = job({ _id: 'archive:1', total: 4, cursor: 2 });
    stubQueue([resuming]);
    sinon.stub(db.sentinel, 'getAttachment').resolves(Buffer.from('a\nb\nc\nd', 'utf8'));
    lib.__set__('BATCH_SIZE', 10);

    const archiveBatch = sinon.stub().resolves();
    lib.__set__('archiveBatch', archiveBatch);

    await lib.archive();

    chai.expect(archiveBatch.callCount).to.equal(1);
    chai.expect(archiveBatch.args[0][0]).to.deep.equal(['c', 'd']);
  });

  it('halts the entire run when a job throws — relies on the next scheduled fire to retry', async () => {
    const failing = job({ _id: 'archive:1', total: 1 });
    const next = job({ _id: 'archive:2', total: 1 });
    const { queue } = stubQueue([failing, next]);
    sinon.stub(db.sentinel, 'getAttachment').resolves(Buffer.from('x', 'utf8'));

    const archiveBatch = sinon.stub().rejects(new Error('boom'));
    lib.__set__('archiveBatch', archiveBatch);

    await lib.archive();

    chai.expect(archiveBatch.callCount).to.equal(1);
    // Failing job is NOT deleted (still in the queue for retry on the next scheduled run).
    chai.expect(queue[0]._deleted).to.not.equal(true);
    // The next job in the queue was not touched.
    chai.expect(queue[1]._deleted).to.not.equal(true);
  });

  it('records the error on the job doc when archiveBatch throws', async () => {
    const failing = job({ _id: 'archive:1', total: 1 });
    const { queue } = stubQueue([failing]);
    sinon.stub(db.sentinel, 'getAttachment').resolves(Buffer.from('x', 'utf8'));
    sinon.stub(Date, 'now').returns(5000);

    const archiveBatch = sinon.stub().rejects(new Error('disk full'));
    lib.__set__('archiveBatch', archiveBatch);

    await lib.archive();

    chai.expect(queue[0].error_count).to.equal(1);
    chai.expect(queue[0].errors).to.deep.equal([{ date: 5000, message: 'disk full' }]);
    chai.expect(queue[0]._deleted).to.not.equal(true);
    chai.expect(queue[0].cursor).to.equal(0);
  });

  it('caps the errors array at MAX_ERRORS_KEPT while error_count counts every failure', async () => {
    const failing = job({
      _id: 'archive:1',
      total: 1,
      error_count: 4,
      errors: [
        { date: 1, message: 'old-1' },
        { date: 2, message: 'old-2' },
        { date: 3, message: 'old-3' },
        { date: 4, message: 'old-4' },
      ],
    });
    const { queue } = stubQueue([failing]);
    sinon.stub(db.sentinel, 'getAttachment').resolves(Buffer.from('x', 'utf8'));
    let clock = 100;
    sinon.stub(Date, 'now').callsFake(() => ++clock);

    const archiveBatch = sinon.stub().rejects(new Error('boom-5'));
    lib.__set__('archiveBatch', archiveBatch);

    await lib.archive();
    // Each lib.archive() call is one failed batch → one new error entry, error_count bumped.
    await lib.archive();
    await lib.archive();

    chai.expect(queue[0].error_count).to.equal(7); // 4 seeded + 3 new
    chai.expect(queue[0].errors).to.have.lengthOf(5);
    // Oldest two seeded entries fell off; latest three are the new failures.
    chai.expect(queue[0].errors.map(e => e.message)).to.deep.equal([
      'old-3',
      'old-4',
      'boom-5',
      'boom-5',
      'boom-5',
    ]);
  });

  it('falls back to the stack when an error has no message', async () => {
    const failing = job({ _id: 'archive:1', total: 1 });
    const { queue } = stubQueue([failing]);
    sinon.stub(db.sentinel, 'getAttachment').resolves(Buffer.from('x', 'utf8'));
    sinon.stub(Date, 'now').returns(9000);

    const stackOnly = { stack: 'Error\n    at somewhere' };
    const archiveBatch = sinon.stub().rejects(stackOnly);
    lib.__set__('archiveBatch', archiveBatch);

    await lib.archive();

    chai.expect(queue[0].error_count).to.equal(1);
    chai.expect(queue[0].errors[0].message).to.equal('Error\n    at somewhere');
  });

  it('falls back to the raw err value when it has neither message nor stack', async () => {
    const failing = job({ _id: 'archive:1', total: 1 });
    const { queue } = stubQueue([failing]);
    sinon.stub(db.sentinel, 'getAttachment').resolves(Buffer.from('x', 'utf8'));
    sinon.stub(Date, 'now').returns(9999);

    // A non-Error rejection value with no `message` and no `stack`. sinon.rejects
    // forwards non-Error/non-string values as-is, so recordError sees the bare object
    // and falls through to the final `|| err` branch.
    const rawErr = { code: 42 };
    const archiveBatch = sinon.stub().rejects(rawErr);
    lib.__set__('archiveBatch', archiveBatch);

    await lib.archive();

    chai.expect(queue[0].error_count).to.equal(1);
    chai.expect(queue[0].errors[0].message).to.equal(rawErr);
  });

  it('is a no-op while another archive run is in flight', async () => {
    let release;
    sinon.stub(db.sentinel, 'allDocs').returns(new Promise(resolve => {
      release = () => resolve({ rows: [] });
    }));

    const first = lib.archive();
    const second = lib.archive();

    release();
    await Promise.all([first, second]);

    chai.expect(db.sentinel.allDocs.callCount).to.equal(1);
  });

  it('finishes the current batch and exits when the deadline expires mid-job', async () => {
    const pending = job({ _id: 'archive:1', total: 10 });
    const { queue, putSnapshots } = stubQueue([pending]);
    sinon.stub(db.sentinel, 'getAttachment').resolves(Buffer.from('a\nb\nc\nd\ne\nf\ng\nh\ni\nj', 'utf8'));
    lib.__set__('BATCH_SIZE', 3);

    let clock = 1000;
    const nowStub = sinon.stub(Date, 'now').callsFake(() => clock);
    const archiveBatch = sinon.stub().callsFake(() => {
      clock += 100;
    });
    lib.__set__('archiveBatch', archiveBatch);

    await lib.archive({ duration: 250 });
    nowStub.restore();

    // duration=250 from clock=1000 → deadline=1250. After 3 batches clock=1300, loop exits.
    chai.expect(archiveBatch.callCount).to.equal(3);
    chai.expect(queue[0]).to.include({ cursor: 9 });
    chai.expect(queue[0]._deleted).to.not.equal(true);
    chai.expect(putSnapshots.some(d => d._deleted)).to.equal(false);
  });

  it('does not start the next job after the deadline expires', async () => {
    const job1 = job({ _id: 'archive:1', total: 1 });
    const job2 = job({ _id: 'archive:2', total: 1 });
    const { queue } = stubQueue([job1, job2]);
    sinon.stub(db.sentinel, 'getAttachment').resolves(Buffer.from('x', 'utf8'));

    let clock = 1000;
    const nowStub = sinon.stub(Date, 'now').callsFake(() => clock);
    const archiveBatch = sinon.stub().callsFake(() => {
      clock += 500;
    });
    lib.__set__('archiveBatch', archiveBatch);

    await lib.archive({ duration: 300 });
    nowStub.restore();

    chai.expect(archiveBatch.callCount).to.equal(1);
    chai.expect(queue[0]._deleted).to.equal(true);
    chai.expect(queue[1]._deleted).to.not.equal(true);
  });

  it('runs all queued jobs to completion when no duration is provided', async () => {
    const job1 = job({ _id: 'archive:1', total: 1 });
    const job2 = job({ _id: 'archive:2', total: 1 });
    const { queue } = stubQueue([job1, job2]);
    sinon.stub(db.sentinel, 'getAttachment').resolves(Buffer.from('x', 'utf8'));
    const archiveBatch = sinon.stub().resolves();
    lib.__set__('archiveBatch', archiveBatch);

    await lib.archive();

    chai.expect(archiveBatch.callCount).to.equal(2);
    chai.expect(queue[0]._deleted).to.equal(true);
    chai.expect(queue[1]._deleted).to.equal(true);
  });

  it('calls indexViews every 10 batches', async () => {
    const pending = job({ _id: 'archive:1', total: 25 });
    stubQueue([pending]);
    sinon.stub(db.sentinel, 'getAttachment').resolves(Buffer.from('x\n'.repeat(25).slice(0, -1), 'utf8'));
    lib.__set__('BATCH_SIZE', 1);

    const indexViews = sinon.stub().resolves();
    lib.__set__('indexViews', indexViews);

    await lib.archive();

    chai.expect(indexViews.callCount).to.equal(2);
  });

  it('refetches the doc before each put so a stale _rev does not crash the run', async () => {
    const pending = job({ _id: 'archive:1', total: 2, _rev: '1-stale' });
    const { putSnapshots, queue } = stubQueue([pending]);
    sinon.stub(db.sentinel, 'getAttachment').resolves(Buffer.from('a\nb', 'utf8'));
    lib.__set__('BATCH_SIZE', 1);

    // Simulate an external edit between fetchNextJob and the first put: bump the queue
    // doc's _rev to something fresher than what archive() saw.
    queue[0]._rev = '7-external';

    await lib.archive();

    chai.expect(queue[0]._deleted).to.equal(true);
    // The first put after the external bump must carry the fresh '7-external' rev.
    chai.expect(putSnapshots[0]._rev).to.equal('7-external');
  });

  it('releases the in-flight guard even when allDocs throws', async () => {
    sinon.stub(db.sentinel, 'allDocs').rejects(new Error('couch down'));

    await lib.archive();
    chai.expect(lib.__get__('currentlyArchiving')).to.equal(false);

    db.sentinel.allDocs.resolves({ rows: [] });
    await lib.archive();
    chai.expect(db.sentinel.allDocs.callCount).to.equal(2);
  });

  describe('canArchive', () => {
    it('accepts the four archivable types', () => {
      const canArchive = lib.__get__('canArchive');
      chai.expect(canArchive({ type: 'contact' })).to.equal(true);
      chai.expect(canArchive({ type: 'data_record' })).to.equal(true);
      chai.expect(canArchive({ type: 'task' })).to.equal(true);
      chai.expect(canArchive({ type: 'target' })).to.equal(true);
    });

    it('rejects other types and missing docs', () => {
      const canArchive = lib.__get__('canArchive');
      chai.expect(canArchive({ type: 'person' })).to.equal(false);
      chai.expect(canArchive({ type: 'clinic' })).to.equal(false);
      chai.expect(canArchive({ type: 'feedback' })).to.equal(false);
      chai.expect(canArchive({})).to.equal(false);
      chai.expect(canArchive(null)).to.equal(false);
      chai.expect(canArchive(undefined)).to.equal(false);
    });
  });

  describe('archiveBatch', () => {
    // The outer beforeEach stubs `archiveBatch` on `lib` so the loop tests can observe
    // its inputs cheaply. These tests want the real implementation, so they rewire a
    // fresh module instance whose `archiveBatch` is still the original code.
    let freshLib;
    beforeEach(() => {
      freshLib = rewire('../../../src/lib/archiving');
    });

    it('does nothing when the batch has no usable ids', async () => {
      const archiveBatch = freshLib.__get__('archiveBatch');
      sinon.stub(db.medic, 'allDocs');
      sinon.stub(db.archive, 'bulkDocs');
      sinon.stub(db, 'purge');

      await archiveBatch([]);
      await archiveBatch(['', '   ']);

      chai.expect(db.medic.allDocs.callCount).to.equal(0);
      chai.expect(db.archive.bulkDocs.callCount).to.equal(0);
      chai.expect(db.purge.callCount).to.equal(0);
    });

    it('archives only docs whose type passes canArchive, purges them, and audits', async () => {
      const archiveBatch = freshLib.__get__('archiveBatch');
      sinon.stub(Date, 'now').returns(424242);

      sinon.stub(db.medic, 'allDocs').resolves({
        rows: [
          { doc: { _id: 'c1', _rev: '1-a', type: 'contact', name: 'C' } },
          { doc: { _id: 'r1', _rev: '1-b', type: 'data_record', form: 'visit' } },
          { doc: { _id: 'p1', _rev: '1-c', type: 'person' } }, // not archivable
          { doc: null }, // missing
        ],
      });
      sinon.stub(db.archive, 'bulkDocs').resolves();
      sinon.stub(db, 'purge').resolves();
      sinon.stub(db.sentinel, 'allDocs').resolves({
        rows: [
          { doc: { _id: 'c1-info', _rev: '1-x' } },
          { doc: { _id: 'r1-info', _rev: '1-y' } },
        ],
      });
      const audit = lib.__get__('audit');
      sinon.stub(audit, 'recordArchiving').resolves();

      await archiveBatch([' c1 ', 'r1', 'p1', 'missing']);

      chai.expect(db.medic.allDocs.args[0]).to.deep.equal([{
        attachments: true,
        keys: ['c1', 'r1', 'p1', 'missing'],
        include_docs: true,
        conflicts: true,
      }]);
      chai.expect(db.archive.bulkDocs.args[0][0]).to.deep.equal([
        { _id: 'c1', _rev: '1-a', type: 'contact', name: 'C', archive_date: 424242 },
        { _id: 'r1', _rev: '1-b', type: 'data_record', form: 'visit', archive_date: 424242 },
      ]);
      chai.expect(db.archive.bulkDocs.args[0][1]).to.deep.equal({ new_edits: false });

      // purge is called twice: once for the medic docs, once for their *-info docs.
      chai.expect(db.purge.callCount).to.equal(2);
      chai.expect(db.purge.args[0][1].map(d => d._id)).to.deep.equal(['c1', 'r1']);
      chai.expect(db.sentinel.allDocs.args[0]).to.deep.equal([{
        keys: ['c1-info', 'r1-info'],
        include_docs: true,
        conflicts: true,
      }]);
      chai.expect(db.purge.args[1][1].map(d => d._id)).to.deep.equal(['c1-info', 'r1-info']);

      chai.expect(audit.recordArchiving.args[0]).to.deep.equal([['c1', 'r1'], 424242]);
    });

    it('skips info docs that the sentinel db is missing without crashing the purge call', async () => {
      const archiveBatch = freshLib.__get__('archiveBatch');
      sinon.stub(Date, 'now').returns(1);

      sinon.stub(db.medic, 'allDocs').resolves({
        rows: [{ doc: { _id: 'r1', _rev: '1-a', type: 'data_record' } }],
      });
      sinon.stub(db.archive, 'bulkDocs').resolves();
      sinon.stub(db, 'purge').resolves();
      sinon.stub(db.sentinel, 'allDocs').resolves({
        rows: [{ key: 'r1-info', error: 'not_found' }], // no .doc
      });
      const audit = lib.__get__('audit');
      sinon.stub(audit, 'recordArchiving').resolves();

      await archiveBatch(['r1']);

      // The info-doc purge call gets an empty list (the not-found row was filtered out).
      chai.expect(db.purge.args[1][1]).to.deep.equal([]);
    });
  });

  describe('indexViews', () => {
    it('fires the three index-warming queries in parallel', async () => {
      const freshLib = rewire('../../../src/lib/archiving');
      const indexViews = freshLib.__get__('indexViews');
      sinon.stub(db.medic, 'query').resolves();
      const request = freshLib.__get__('request');
      const environment = freshLib.__get__('environment');
      sinon.stub(environment, 'couchUrl').value('http://couch/medic');
      sinon.stub(request, 'get').resolves();

      await indexViews();

      chai.expect(db.medic.query.callCount).to.equal(2);
      chai.expect(db.medic.query.args).to.deep.equal([
        ['medic/contacts_by_depth', { limit: 1 }],
        ['medic-client/contacts_by_last_visited', { limit: 1 }],
      ]);
      chai.expect(request.get.args[0]).to.deep.equal([{
        url: 'http://couch/medic/_design/medic/_nouveau/docs_by_replication_key',
        qs: { limit: 1, q: '*:*' },
      }]);
    });
  });

  describe('recordError catch path', () => {
    it('logs and swallows when the error-recording put itself fails', async () => {
      const recordError = lib.__get__('recordError');
      const failing = { _id: 'archive:1', _rev: '1-a' };
      sinon.stub(db.sentinel, 'get').rejects(new Error('couch down'));
      sinon.stub(db.sentinel, 'put');
      const logger = lib.__get__('logger');
      sinon.stub(logger, 'error');

      // Should not throw — recordError owns its own try/catch.
      await recordError(failing, new Error('original'));

      chai.expect(db.sentinel.put.callCount).to.equal(0);
      chai.expect(logger.error.callCount).to.equal(1);
      chai.expect(logger.error.args[0][0]).to.match(/could not record error on job archive:1/);
    });
  });

  describe('processJob exercises indexViews every 10 batches', () => {
    it('calls indexViews after the 10th saveJob', async () => {
      // 20 docs at BATCH_SIZE=2 = 10 batches in one cycle.
      const pending = job({ _id: 'archive:1', total: 20 });
      stubQueue([pending]);
      sinon.stub(db.sentinel, 'getAttachment').resolves(
        Buffer.from(Array.from({ length: 20 }, (_, i) => `d${i}`).join('\n'), 'utf8')
      );
      lib.__set__('BATCH_SIZE', 2);

      const archiveBatch = sinon.stub().resolves();
      lib.__set__('archiveBatch', archiveBatch);
      const indexViews = sinon.stub().resolves();
      lib.__set__('indexViews', indexViews);

      await lib.archive();

      chai.expect(archiveBatch.callCount).to.equal(10);
      // indexViews fires after batch 10.
      chai.expect(indexViews.callCount).to.equal(1);
    });
  });
});
