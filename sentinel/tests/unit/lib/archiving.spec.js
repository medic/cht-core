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
});
