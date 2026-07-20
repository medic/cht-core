const sinon = require('sinon');
const rewire = require('rewire');

const db = require('../../../src/db');
const audit = require('@medic/audit');
const request = require('@medic/couch-request');
const environment = require('@medic/environment');
const logger = require('@medic/logger');

// Mirrors of the module's internal sizing constants. The tests never overwrite these on the
// module — batch behavior is exercised with realistically sized jobs instead.
const PURGE_BATCH_SIZE = 1000;
const FETCH_BATCH_SIZE = 100;
const MAX_JOB_ATTEMPTS = 20;
const MAX_ERRORS_KEPT = 5;

const job = (props = {}) => Object.assign({
  _id: 'archive:2026-05-18T00:00:00.000Z:uuid',
  _rev: '1-a',
  total: 0,
  cursor: 0,
}, props);

const makeIds = (count) => Array.from({ length: count }, (_, i) => `d${i}`);

// allDocs / put / get fakes that walk a queue: allDocs returns the first non-deleted
// doc as rows[0], get returns the live doc (404 if deleted), put with _deleted flips
// the queue flag so subsequent allDocs / get behave like the doc is gone.
const stubQueue = (jobs) => {
  const queue = jobs.map(j => ({ ...j }));
  const putSnapshots = [];
  let revCounter = 0;

  sinon.stub(db.sentinel, 'allDocs').callsFake((opts = {}) => {
    const startkey = opts.startkey || '';
    const next = queue.find(j => !j._deleted && j._id >= startkey);
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

const stubAttachment = (idsByJob) => sinon.stub(db.sentinel, 'getAttachment').callsFake(jobId => {
  const ids = idsByJob[jobId];
  return ids
    ? Promise.resolve(Buffer.from(ids.join('\n'), 'utf8'))
    : Promise.reject(new Error(`unexpected getAttachment for ${jobId}`));
});

const docRows = (keys) => ({
  rows: keys.map(id => ({ doc: { _id: id, _rev: '1-a', type: 'data_record' } })),
});

// Shapes a _bulk_get response: { id: [revs] } → one result per id, one leaf per rev.
// A rev prefixed with 'deleted:' becomes a deleted leaf; an empty rev list means not found.
const bulkGetResult = (leavesById) => ({
  results: Object.entries(leavesById).map(([id, revs]) => ({
    id,
    docs: revs.length
      ? revs.map(rev => rev.startsWith('deleted:')
        ? { ok: { _id: id, _rev: rev.replace('deleted:', ''), _deleted: true } }
        : { ok: { _id: id, _rev: rev } })
      : [{ error: { id, error: 'not_found' } }],
  })),
});

// Stubs every external surface archiveBatch touches, wired as a consistent happy path:
// every requested id exists in medic as a data_record at rev 1-a, every doc has an info
// doc at rev 1-x, archive writes / purges / audit all succeed. Tests reconfigure
// individual stubs to shape docs or inject failures.
const stubBatchExternals = () => {
  sinon.stub(db.medic, 'allDocs').callsFake(({ keys }) => Promise.resolve(docRows(keys)));
  sinon.stub(db.archive, 'bulkDocs').resolves();
  sinon.stub(db, 'purge').resolves();
  sinon.stub(db.sentinel, 'bulkGet').callsFake(({ docs }) => Promise.resolve(
    bulkGetResult(Object.fromEntries(docs.map(({ id }) => [id, ['1-x']])))
  ));
  sinon.stub(db.medic, 'bulkGet').callsFake(({ docs }) => Promise.resolve(
    bulkGetResult(Object.fromEntries(docs.map(({ id }) => [id, ['1-a']])))
  ));
  sinon.stub(audit, 'recordArchiving').resolves();
};

describe('Sentinel archiving lib', () => {
  let lib;
  let clock;

  beforeEach(() => {
    clock = sinon.useFakeTimers({ toFake: ['Date'] });
    lib = rewire('../../../src/lib/archiving');
    // Disable archiveBatch and indexViews by default — the queue stubs don't model the
    // medic / archive dbs or _purge, and most tests just want to observe the loop.
    lib.__set__('archiveBatch', sinon.stub().resolves());
    lib.__set__('indexViews', sinon.stub().resolves());
  });

  afterEach(() => {
    sinon.restore();
    clock.restore();
  });

  it('scans the archive: prefix range with limit:1 to find the next job', async () => {
    sinon.stub(db.sentinel, 'allDocs').resolves({ rows: [] });

    await lib.archive();

    expect(db.sentinel.allDocs.callCount).to.equal(1);
    expect(db.sentinel.allDocs.args[0][0]).to.deep.equal({
      startkey: 'archive:',
      endkey: 'archive:\ufff0',
      include_docs: true,
      limit: 1,
    });
  });

  it('processes a job in batches and deletes the doc when cursor reaches total', async () => {
    const ids = makeIds(PURGE_BATCH_SIZE * 2 + 500);
    const pending = job({ _id: 'archive:1', total: ids.length });
    const { queue, putSnapshots } = stubQueue([pending]);
    stubAttachment({ 'archive:1': ids });

    const archiveBatch = sinon.stub().resolves();
    lib.__set__('archiveBatch', archiveBatch);

    await lib.archive();

    expect(archiveBatch.callCount).to.equal(3);
    expect(archiveBatch.args[0][0]).to.deep.equal(ids.slice(0, PURGE_BATCH_SIZE));
    expect(archiveBatch.args[1][0]).to.deep.equal(ids.slice(PURGE_BATCH_SIZE, PURGE_BATCH_SIZE * 2));
    expect(archiveBatch.args[2][0]).to.deep.equal(ids.slice(PURGE_BATCH_SIZE * 2));

    // Three saveJob calls: two intermediate puts, then one delete put.
    expect(putSnapshots).to.have.lengthOf(3);
    expect(putSnapshots[0]).to.include({ cursor: PURGE_BATCH_SIZE });
    expect(putSnapshots[0]._deleted).to.not.equal(true);
    expect(putSnapshots[1]).to.include({ cursor: PURGE_BATCH_SIZE * 2 });
    expect(putSnapshots[1]._deleted).to.not.equal(true);
    expect(putSnapshots[2]).to.include({ _id: 'archive:1', cursor: ids.length, _deleted: true });
    expect(queue[0]._deleted).to.equal(true);
  });

  it('appends a {date, cursor} entry to history on every saveJob, including across cycles', async () => {
    const ids = makeIds(PURGE_BATCH_SIZE + 500);
    const pending = job({ _id: 'archive:1', total: ids.length });
    const { queue, putSnapshots } = stubQueue([pending]);
    stubAttachment({ 'archive:1': ids });

    clock.setSystemTime(1000);
    const archiveBatch = sinon.stub().callsFake(() => {
      clock.tick(10);
    });
    lib.__set__('archiveBatch', archiveBatch);

    await lib.archive();

    // Two saveJob calls: mid-job, then the last batch (which also deletes).
    // After both saves, the job's history holds one entry per saveJob.
    expect(putSnapshots).to.have.lengthOf(2);
    expect(queue[0].history).to.deep.equal([
      { date: 1010, cursor: PURGE_BATCH_SIZE },
      { date: 1020, cursor: ids.length },
    ]);
  });

  it('preserves prior-cycle history when resuming a job that was already partially saved', async () => {
    const earlierHistory = [{ date: 500, cursor: 1 }];
    const resuming = job({ _id: 'archive:1', total: 3, cursor: 1, history: [...earlierHistory] });
    const { queue, putSnapshots } = stubQueue([resuming]);
    stubAttachment({ 'archive:1': ['a', 'b', 'c'] });

    clock.setSystemTime(2000);
    const archiveBatch = sinon.stub().callsFake(() => {
      clock.tick(5);
    });
    lib.__set__('archiveBatch', archiveBatch);

    await lib.archive();

    expect(putSnapshots[0].history).to.deep.equal([
      ...earlierHistory,
      { date: 2005, cursor: 3 },
    ]);
    expect(queue[0].history).to.deep.equal([
      ...earlierHistory,
      { date: 2005, cursor: 3 },
    ]);
  });

  it('resumes a job from its existing cursor', async () => {
    const resuming = job({ _id: 'archive:1', total: 4, cursor: 2 });
    stubQueue([resuming]);
    stubAttachment({ 'archive:1': ['a', 'b', 'c', 'd'] });

    const archiveBatch = sinon.stub().resolves();
    lib.__set__('archiveBatch', archiveBatch);

    await lib.archive();

    expect(archiveBatch.callCount).to.equal(1);
    expect(archiveBatch.args[0][0]).to.deep.equal(['c', 'd']);
  });

  it('corrects total and completes when the attachment holds fewer ids than job.total', async () => {
    const truncated = job({ _id: 'archive:1', total: 10 });
    const { queue } = stubQueue([truncated]);
    stubAttachment({ 'archive:1': ['a', 'b', 'c'] });

    const archiveBatch = sinon.stub().resolves();
    lib.__set__('archiveBatch', archiveBatch);

    await lib.archive();

    expect(archiveBatch.callCount).to.equal(1);
    expect(archiveBatch.args[0][0]).to.deep.equal(['a', 'b', 'c']);
    expect(queue[0]._deleted).to.equal(true);
  });

  it('corrects total and processes every id when the attachment holds more ids than job.total', async () => {
    const understated = job({ _id: 'archive:1', total: 1 });
    const { queue } = stubQueue([understated]);
    stubAttachment({ 'archive:1': ['a', 'b', 'c'] });

    const archiveBatch = sinon.stub().resolves();
    lib.__set__('archiveBatch', archiveBatch);

    await lib.archive();

    expect(archiveBatch.callCount).to.equal(1);
    expect(archiveBatch.args[0][0]).to.deep.equal(['a', 'b', 'c']);
    expect(queue[0]._deleted).to.equal(true);
  });

  it('isolates a failing job and still processes the jobs behind it', async () => {
    const failing = job({ _id: 'archive:1', total: 1 });
    const next = job({ _id: 'archive:2', total: 1 });
    const { queue } = stubQueue([failing, next]);
    stubAttachment({ 'archive:1': ['x1'], 'archive:2': ['x2'] });

    // First job throws, second succeeds.
    const archiveBatch = sinon.stub();
    archiveBatch.onCall(0).rejects(new Error('boom'));
    archiveBatch.onCall(1).resolves();
    lib.__set__('archiveBatch', archiveBatch);

    await lib.archive();

    expect(archiveBatch.callCount).to.equal(2);
    // Failing job is recorded but NOT deleted (retried on the next scheduled run).
    expect(queue[0]._deleted).to.not.equal(true);
    expect(queue[0].error_count).to.equal(1);
    // The job behind it is no longer blocked — it ran to completion.
    expect(queue[1]._deleted).to.equal(true);
  });

  it('quarantines a job once it has failed MAX_JOB_ATTEMPTS times', async () => {
    const failing = job({ _id: 'archive:1', total: 1, error_count: MAX_JOB_ATTEMPTS - 1 });
    const { queue } = stubQueue([failing]);
    stubAttachment({ 'archive:1': ['x'] });

    lib.__set__('archiveBatch', sinon.stub().rejects(new Error('boom')));

    await lib.archive();

    // The failure trips the threshold: status flips to 'failed', but the doc is kept for inspection.
    expect(queue[0].error_count).to.equal(MAX_JOB_ATTEMPTS);
    expect(queue[0].status).to.equal('failed');
    expect(queue[0]._deleted).to.not.equal(true);
  });

  it('skips a quarantined job and processes the next healthy one', async () => {
    const quarantined = job({ _id: 'archive:1', total: 1, status: 'failed', error_count: 20 });
    const healthy = job({ _id: 'archive:2', total: 1 });
    const { queue } = stubQueue([quarantined, healthy]);
    stubAttachment({ 'archive:1': ['x1'], 'archive:2': ['x2'] });

    const archiveBatch = sinon.stub().resolves();
    lib.__set__('archiveBatch', archiveBatch);

    await lib.archive();

    // Quarantined job is never read or processed...
    expect(queue[0]._deleted).to.not.equal(true);
    expect(queue[0].status).to.equal('failed');
    expect(db.sentinel.getAttachment.args.map(a => a[0])).to.deep.equal(['archive:2']);
    // ...and the healthy job behind it still completes.
    expect(archiveBatch.callCount).to.equal(1);
    expect(queue[1]._deleted).to.equal(true);
  });

  it('records the error on the job doc when archiveBatch throws', async () => {
    const failing = job({ _id: 'archive:1', total: 1 });
    const { queue } = stubQueue([failing]);
    stubAttachment({ 'archive:1': ['x'] });
    clock.setSystemTime(5000);

    lib.__set__('archiveBatch', sinon.stub().rejects(new Error('disk full')));

    await lib.archive();

    expect(queue[0].error_count).to.equal(1);
    expect(queue[0].errors).to.deep.equal([{ date: 5000, message: 'disk full' }]);
    expect(queue[0]._deleted).to.not.equal(true);
    expect(queue[0].cursor).to.equal(0);
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
    stubAttachment({ 'archive:1': ['x'] });
    clock.setSystemTime(100);

    lib.__set__('archiveBatch', sinon.stub().rejects(new Error('boom-5')));

    await lib.archive();
    // Each lib.archive() call is one failed batch → one new error entry, error_count bumped.
    await lib.archive();
    await lib.archive();

    expect(queue[0].error_count).to.equal(7); // 4 seeded + 3 new
    expect(queue[0].errors).to.have.lengthOf(MAX_ERRORS_KEPT);
    // Oldest two seeded entries fell off; latest three are the new failures.
    expect(queue[0].errors.map(e => e.message)).to.deep.equal([
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
    stubAttachment({ 'archive:1': ['x'] });
    clock.setSystemTime(9000);

    const stackOnly = { stack: 'Error\n    at somewhere' };
    lib.__set__('archiveBatch', sinon.stub().rejects(stackOnly));

    await lib.archive();

    expect(queue[0].error_count).to.equal(1);
    expect(queue[0].errors[0].message).to.equal('Error\n    at somewhere');
  });

  it('falls back to the raw err value when it has neither message nor stack', async () => {
    const failing = job({ _id: 'archive:1', total: 1 });
    const { queue } = stubQueue([failing]);
    stubAttachment({ 'archive:1': ['x'] });
    clock.setSystemTime(9999);

    // A non-Error rejection value with no `message` and no `stack`. sinon.rejects
    // forwards non-Error/non-string values as-is, so recordError sees the bare object
    // and falls through to the final `|| err` branch.
    const rawErr = { code: 42 };
    lib.__set__('archiveBatch', sinon.stub().rejects(rawErr));

    await lib.archive();

    expect(queue[0].error_count).to.equal(1);
    expect(queue[0].errors[0].message).to.equal(rawErr);
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

    expect(db.sentinel.allDocs.callCount).to.equal(1);
  });

  it('finishes the current batch and exits when the deadline expires mid-job', async () => {
    const ids = makeIds(PURGE_BATCH_SIZE * 3 + 500);
    const pending = job({ _id: 'archive:1', total: ids.length });
    const { queue, putSnapshots } = stubQueue([pending]);
    stubAttachment({ 'archive:1': ids });

    clock.setSystemTime(1000);
    const archiveBatch = sinon.stub().callsFake(() => {
      clock.tick(100);
    });
    lib.__set__('archiveBatch', archiveBatch);

    await lib.archive(250);

    // duration=250 from clock=1000 → deadline=1250. After 3 batches clock=1300, loop exits.
    expect(archiveBatch.callCount).to.equal(3);
    expect(queue[0]).to.include({ cursor: PURGE_BATCH_SIZE * 3 });
    expect(queue[0]._deleted).to.not.equal(true);
    expect(putSnapshots.some(d => d._deleted)).to.equal(false);
  });

  it('does not start the next job after the deadline expires', async () => {
    const job1 = job({ _id: 'archive:1', total: 1 });
    const job2 = job({ _id: 'archive:2', total: 1 });
    const { queue } = stubQueue([job1, job2]);
    stubAttachment({ 'archive:1': ['x1'], 'archive:2': ['x2'] });

    clock.setSystemTime(1000);
    const archiveBatch = sinon.stub().callsFake(() => {
      clock.tick(500);
    });
    lib.__set__('archiveBatch', archiveBatch);

    await lib.archive(300);

    expect(archiveBatch.callCount).to.equal(1);
    expect(queue[0]._deleted).to.equal(true);
    expect(queue[1]._deleted).to.not.equal(true);
  });

  it('runs all queued jobs to completion when no duration is provided', async () => {
    const job1 = job({ _id: 'archive:1', total: 1 });
    const job2 = job({ _id: 'archive:2', total: 1 });
    const { queue } = stubQueue([job1, job2]);
    stubAttachment({ 'archive:1': ['x1'], 'archive:2': ['x2'] });
    const archiveBatch = sinon.stub().resolves();
    lib.__set__('archiveBatch', archiveBatch);

    await lib.archive();

    expect(archiveBatch.callCount).to.equal(2);
    expect(queue[0]._deleted).to.equal(true);
    expect(queue[1]._deleted).to.equal(true);
  });

  it('calls indexViews every 10 batches', async () => {
    const ids = makeIds(PURGE_BATCH_SIZE * 25);
    const pending = job({ _id: 'archive:1', total: ids.length });
    stubQueue([pending]);
    stubAttachment({ 'archive:1': ids });

    const indexViews = sinon.stub().resolves();
    lib.__set__('indexViews', indexViews);

    await lib.archive();

    // 25 batches → indexViews fires after batches 10 and 20.
    expect(indexViews.callCount).to.equal(2);
  });

  it('refetches the doc before each put so a stale _rev does not crash the run', async () => {
    const ids = makeIds(PURGE_BATCH_SIZE + 500);
    const pending = job({ _id: 'archive:1', total: ids.length, _rev: '1-stale' });
    const { putSnapshots, queue } = stubQueue([pending]);
    stubAttachment({ 'archive:1': ids });

    // Simulate an external edit between fetchNextJob and the first put: bump the queue
    // doc's _rev to something fresher than what archive() saw.
    queue[0]._rev = '7-external';

    await lib.archive();

    expect(queue[0]._deleted).to.equal(true);
    // The first put after the external bump must carry the fresh '7-external' rev.
    expect(putSnapshots[0]._rev).to.equal('7-external');
  });

  it('releases the in-flight guard even when allDocs throws', async () => {
    sinon.stub(db.sentinel, 'allDocs').rejects(new Error('couch down'));

    await lib.archive();

    // A second run proceeding past the guard proves the failed run released it.
    db.sentinel.allDocs.resolves({ rows: [] });
    await lib.archive();
    expect(db.sentinel.allDocs.callCount).to.equal(2);
  });

  describe('archiveBatch', () => {
    // The outer beforeEach stubs `archiveBatch` on `lib` so the loop tests can observe
    // its inputs cheaply. These tests want the real implementation, so they rewire a
    // fresh module instance whose `archiveBatch` is still the original code.
    let archiveBatch;
    beforeEach(() => {
      archiveBatch = rewire('../../../src/lib/archiving').__get__('archiveBatch');
    });

    it('does nothing when the batch has no usable ids', async () => {
      stubBatchExternals();

      await archiveBatch([]);
      await archiveBatch(['', '   ']);

      expect(db.medic.allDocs.callCount).to.equal(0);
      expect(db.archive.bulkDocs.callCount).to.equal(0);
      expect(db.purge.callCount).to.equal(0);
    });

    it('archives only docs whose type passes canArchive, purges them, and audits', async () => {
      stubBatchExternals();
      clock.setSystemTime(424242);

      db.medic.allDocs.resolves({
        rows: [
          { doc: { _id: 'c1', _rev: '1-a', type: 'contact', name: 'C' } },
          { doc: { _id: 'r1', _rev: '1-b', type: 'data_record', form: 'visit' } },
          { doc: { _id: 'f1', _rev: '1-c', type: 'feedback' } }, // not archivable
          { doc: null }, // missing
        ],
      });
      db.sentinel.bulkGet.resolves(bulkGetResult({
        'c1-info': ['1-x'],
        'r1-info': ['1-y'],
      }));
      db.medic.bulkGet.resolves(bulkGetResult({
        c1: ['1-a'],
        r1: ['1-b'],
      }));

      await archiveBatch([' c1 ', 'r1', 'f1', 'missing']);

      expect(db.medic.allDocs.args[0]).to.deep.equal([{
        attachments: true,
        keys: ['c1', 'r1', 'f1', 'missing'],
        include_docs: true,
      }]);
      expect(db.archive.bulkDocs.args[0][0]).to.deep.equal([
        { _id: 'c1', _rev: '1-a', type: 'contact', name: 'C', archive_date: 424242 },
        { _id: 'r1', _rev: '1-b', type: 'data_record', form: 'visit', archive_date: 424242 },
      ]);
      expect(db.archive.bulkDocs.args[0][1]).to.deep.equal({ new_edits: false });

      expect(db.sentinel.bulkGet.args[0]).to.deep.equal([{
        docs: [{ id: 'c1-info' }, { id: 'r1-info' }],
      }]);
      expect(db.medic.bulkGet.args[0]).to.deep.equal([{
        docs: [{ id: 'c1' }, { id: 'r1' }],
      }]);
      expect(db.purge.callCount).to.equal(2);
      expect(db.purge.args[0][1]).to.deep.equal([
        { _id: 'c1-info', _revs: ['1-x'] },
        { _id: 'r1-info', _revs: ['1-y'] },
      ]);
      expect(db.purge.args[1][1]).to.deep.equal([
        { _id: 'c1', _revs: ['1-a'] },
        { _id: 'r1', _revs: ['1-b'] },
      ]);

      expect(audit.recordArchiving.args[0]).to.deep.equal([['c1', 'r1'], 424242]);
    });

    it('archives every archivable doc type, including hardcoded contact types, and skips the rest', async () => {
      stubBatchExternals();
      const types = ['contact', 'person', 'clinic', 'health_center', 'district_hospital', 'data_record',
        'task', 'target'];
      db.medic.allDocs.resolves({ rows: [
        ...types.map((type, i) => ({ doc: { _id: `ok${i}`, _rev: '1-a', type } })),
        { doc: { _id: 'bad0', _rev: '1-a', type: 'feedback' } },
        { doc: { _id: 'bad1', _rev: '1-a', type: 'form' } },
        { doc: { _id: 'bad2', _rev: '1-a' } }, // no type
        { doc: null }, // missing
      ] });

      await archiveBatch([...types.map((t, i) => `ok${i}`), 'bad0', 'bad1', 'bad2', 'missing']);

      expect(db.archive.bulkDocs.args[0][0].map(d => ({ id: d._id, type: d.type }))).to.deep.equal(
        types.map((type, i) => ({ id: `ok${i}`, type }))
      );
      expect(audit.recordArchiving.args[0][0]).to.deep.equal(types.map((t, i) => `ok${i}`));
    });

    it('fetches and writes docs in chunks to bound the inlined-attachment payloads', async () => {
      stubBatchExternals();
      clock.setSystemTime(1);
      const ids = makeIds(FETCH_BATCH_SIZE * 2 + 50);

      await archiveBatch(ids);

      const chunks = [
        ids.slice(0, FETCH_BATCH_SIZE),
        ids.slice(FETCH_BATCH_SIZE, FETCH_BATCH_SIZE * 2),
        ids.slice(FETCH_BATCH_SIZE * 2),
      ];
      expect(db.medic.allDocs.args.map(a => a[0].keys)).to.deep.equal(chunks);
      expect(db.archive.bulkDocs.args.map(a => a[0].map(d => d._id))).to.deep.equal(chunks);
      expect(db.archive.bulkDocs.args.map(a => a[1])).to.deep.equal(Array(3).fill({ new_edits: false }));
      // Audit and purge still cover the full batch in one pass each.
      expect(audit.recordArchiving.args).to.deep.equal([[ids, 1]]);
      expect(db.purge.args[1][1].map(d => d._id)).to.deep.equal(ids);
    });

    it('purges every leaf revision, including live and resolved (deleted) conflicts', async () => {
      stubBatchExternals();
      clock.setSystemTime(1);

      db.medic.allDocs.resolves({
        rows: [{ doc: { _id: 'r1', _rev: '2-winner', type: 'data_record' } }],
      });
      // r1 has a live conflict and a resolved (deleted) conflict branch.
      db.medic.bulkGet.resolves(bulkGetResult({
        r1: ['2-winner', '2-conflict', 'deleted:2-resolved'],
      }));

      await archiveBatch(['r1']);

      expect(db.purge.args[1][1]).to.deep.equal([
        { _id: 'r1', _revs: ['2-winner', '2-conflict', '2-resolved'] },
      ]);
      // Only the winning revision is archived.
      expect(db.archive.bulkDocs.args[0][0].map(d => d._rev)).to.deep.equal(['2-winner']);
    });

    it('skips the info-doc purge request entirely when no info docs exist', async () => {
      stubBatchExternals();
      clock.setSystemTime(1);
      db.sentinel.bulkGet.resolves(bulkGetResult({ 'r1-info': [] })); // not found

      await archiveBatch(['r1']);

      // No info docs found → only the medic purge fires.
      expect(db.purge.callCount).to.equal(1);
      expect(db.purge.args[0][1]).to.deep.equal([{ _id: 'r1', _revs: ['1-a'] }]);
    });

    it('purges from medic only after the archive write, audit, and info-doc purge', async () => {
      stubBatchExternals();
      clock.setSystemTime(1);

      await archiveBatch(['r1']);

      const medicPurge = db.purge.getCall(1);
      expect(medicPurge.args[1].map(d => d._id)).to.deep.equal(['r1']);
      expect(db.archive.bulkDocs.calledBefore(medicPurge)).to.equal(true);
      expect(audit.recordArchiving.calledBefore(medicPurge)).to.equal(true);
      expect(db.purge.getCall(0).calledBefore(medicPurge)).to.equal(true);
    });

    it('does not purge from medic when the audit write fails, leaving the docs recoverable', async () => {
      stubBatchExternals();
      clock.setSystemTime(1);
      audit.recordArchiving.rejects(new Error('audit down'));

      let caught;
      try {
        await archiveBatch(['r1']);
      } catch (err) {
        caught = err;
      }

      expect(caught?.message).to.equal('audit down');
      expect(db.purge.callCount).to.equal(0);
    });

    it('surfaces a failure from the final medic purge after archive + audit have run', async () => {
      stubBatchExternals();
      clock.setSystemTime(1);
      db.purge.onCall(0).resolves(); // info-doc purge
      db.purge.onCall(1).rejects(new Error('purge down')); // medic purge

      let caught;
      try {
        await archiveBatch(['r1']);
      } catch (err) {
        caught = err;
      }

      expect(caught?.message).to.equal('purge down');
      expect(db.archive.bulkDocs.callCount).to.equal(1);
      expect(audit.recordArchiving.callCount).to.equal(1);
    });
  });

  describe('indexViews', () => {
    it('fires the three index-warming queries', async () => {
      const indexViews = rewire('../../../src/lib/archiving').__get__('indexViews');
      sinon.stub(db.medic, 'query').resolves();
      sinon.stub(environment, 'couchUrl').value('http://couch/medic');
      sinon.stub(request, 'get').resolves();

      await indexViews();

      expect(db.medic.query.args).to.deep.equal([
        ['medic/contacts_by_depth', { limit: 1 }],
        ['medic-client/contacts_by_last_visited', { limit: 1 }],
      ]);
      expect(request.get.args).to.deep.equal([[{
        url: 'http://couch/medic/_design/medic/_nouveau/docs_by_replication_key',
        qs: { limit: 1, q: '*:*' },
      }]]);
    });
  });

  describe('recordError catch path', () => {
    it('logs and swallows when the error-recording put itself fails', async () => {
      const { putSnapshots } = stubQueue([job({ _id: 'archive:1', total: 1 })]);
      stubAttachment({ 'archive:1': ['x'] });
      lib.__set__('archiveBatch', sinon.stub().rejects(new Error('original')));
      // recordError refetches the job doc before writing — make that refetch fail too.
      db.sentinel.get.rejects(new Error('couch down'));
      sinon.stub(logger, 'error');

      // Should not throw — recordError owns its own try/catch.
      await lib.archive();

      expect(putSnapshots).to.have.lengthOf(0);
      const logged = logger.error.args.map(args => args[0]);
      expect(logged.some(msg => /could not record error on job archive:1/.test(msg))).to.equal(true);
    });
  });
});
