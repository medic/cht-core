const sinon = require('sinon');
const { expect } = require('chai');

const db = require('../../../../src/db');
const { RetryableError } = require('../../../../src/lib/bulk-operations/errors');
const { setParent } = require('../../../../src/lib/bulk-operations/set-parent');

describe('bulk-operations set-parent handler', () => {
  afterEach(() => sinon.restore());

  it('applies matching operations and returns no failures', async () => {
    const batch = [
      { id: 'clinic-1', parent: { _id: 'hc-b', parent: { _id: 'district' } }, current_parent_id: 'hc-a' },
      { id: 'person-1', parent: undefined, current_parent_id: 'hc-a' }, // moved to the root
    ];
    sinon.stub(db.medic, 'allDocs').resolves({ rows: [
      { doc: { _id: 'clinic-1', parent: { _id: 'hc-a', parent: { _id: 'district' } } } },
      { doc: { _id: 'person-1', parent: 'hc-a' } },
    ] });
    const bulkDocs = sinon.stub(db.medic, 'bulkDocs').resolves([ { ok: true }, { ok: true } ]);

    const failed = await setParent(batch, 'action-1');

    expect(failed).to.deep.equal([]);
    const updated = bulkDocs.args[0][0];
    expect(updated.find(d => d._id === 'clinic-1').parent)
      .to.deep.equal({ _id: 'hc-b', parent: { _id: 'district' } });
    expect(updated.find(d => d._id === 'person-1').parent).to.be.undefined;
  });

  it('re-runs the whole batch after a half-finished attempt without reporting failures', async () => {
    // The state a batch is left in when it failed part way: one doc written, one not. The guard on
    // the written one no longer matches, which is exactly what must not be read as a failure.
    const batch = [
      { id: 'done-1', parent: { _id: 'hc-b', parent: { _id: 'district' } }, current_parent_id: 'hc-a' },
      { id: 'todo-1', parent: { _id: 'hc-b', parent: { _id: 'district' } }, current_parent_id: 'hc-a' },
    ];
    sinon.stub(db.medic, 'allDocs').resolves({ rows: [
      { doc: { _id: 'done-1', parent: { _id: 'hc-b', parent: { _id: 'district' } } } },
      { doc: { _id: 'todo-1', parent: { _id: 'hc-a', parent: { _id: 'district' } } } },
    ] });
    const bulkDocs = sinon.stub(db.medic, 'bulkDocs').resolves([ { ok: true } ]);

    const failed = await setParent(batch, 'action-1');

    expect(failed).to.deep.equal([]);
    // only the one that still needs it is written
    expect(bulkDocs.args[0][0].map(doc => doc._id)).to.deep.equal([ 'todo-1' ]);
  });

  it('skips a doc that already holds what we are writing, so a re-run converges', async () => {
    sinon.stub(db.medic, 'allDocs').resolves({ rows: [
      { doc: { _id: 'clinic-1', parent: { _id: 'wanted' } } },
    ] });
    const bulkDocs = sinon.stub(db.medic, 'bulkDocs').resolves([]);

    const failed = await setParent(
      // the guard no longer matches, because we applied this on an earlier attempt
      [ { id: 'clinic-1', parent: { _id: 'wanted' }, current_parent_id: 'something-else' } ],
      'action-1'
    );

    expect(failed).to.deep.equal([]);
    expect(bulkDocs.called).to.equal(false);
  });

  it('lets a failure worth another attempt through, for the caller to classify', async () => {
    sinon.stub(db.medic, 'allDocs').rejects(Object.assign(new Error('couch down'), { status: 503 }));

    await expect(setParent(
      [ { id: 'clinic-1', parent: { _id: 'wanted' }, current_parent_id: 'old' } ],
      'action-1'
    )).to.be.rejectedWith('couch down');
  });

  it('retries a write that lost to a concurrent edit rather than failing it', async () => {
    sinon.stub(db.medic, 'allDocs').resolves({ rows: [
      { doc: { _id: 'clinic-1', parent: { _id: 'hc-a' } } },
    ] });
    sinon.stub(db.medic, 'bulkDocs').resolves([ { id: 'clinic-1', error: 'conflict' } ]);

    await expect(setParent(
      [ { id: 'clinic-1', parent: { _id: 'hc-b' }, current_parent_id: 'hc-a' } ],
      'action-1'
    )).to.be.rejectedWith(RetryableError, /concurrent edit/);
  });

  it('fails an operation whose write couch rejected for any other reason', async () => {
    sinon.stub(db.medic, 'allDocs').resolves({ rows: [
      { doc: { _id: 'clinic-1', parent: { _id: 'hc-a' } } },
    ] });
    sinon.stub(db.medic, 'bulkDocs').resolves([ { id: 'clinic-1', error: 'forbidden' } ]);

    const failed = await setParent(
      [ { id: 'clinic-1', parent: { _id: 'hc-b' }, current_parent_id: 'hc-a' } ],
      'action-1'
    );

    expect(failed.map(op => op.id)).to.deep.equal([ 'clinic-1' ]);
  });

  it('fails an operation whose doc is missing', async () => {
    sinon.stub(db.medic, 'allDocs').resolves({ rows: [ { key: 'gone', error: 'not_found' } ] });
    const bulkDocs = sinon.stub(db.medic, 'bulkDocs').resolves([]);

    const failed = await setParent([ { id: 'gone', current_parent_id: 'hc-a' } ], 'action-1');

    expect(failed.map(op => op.id)).to.deep.equal([ 'gone' ]);
    expect(bulkDocs.called).to.equal(false);
  });

  it('fails an operation whose parent has changed since it was queued', async () => {
    sinon.stub(db.medic, 'allDocs').resolves({ rows: [
      { doc: { _id: 'clinic-1', parent: { _id: 'moved-since' } } },
    ] });
    const bulkDocs = sinon.stub(db.medic, 'bulkDocs').resolves([]);

    const failed = await setParent(
      [ { id: 'clinic-1', parent: { _id: 'hc-b' }, current_parent_id: 'hc-a' } ],
      'action-1'
    );

    expect(failed.map(op => op.id)).to.deep.equal([ 'clinic-1' ]);
    expect(bulkDocs.called).to.equal(false);
  });

  it('fails an operation with no id without querying', async () => {
    const allDocs = sinon.stub(db.medic, 'allDocs').resolves({ rows: [] });
    sinon.stub(db.medic, 'bulkDocs').resolves([]);

    const failed = await setParent([ { current_parent_id: 'hc-a' } ], 'action-1');

    expect(failed).to.have.length(1);
    expect(allDocs.called).to.equal(false);
  });

  it('keeps going after a failure so the rest of the batch still applies', async () => {
    sinon.stub(db.medic, 'allDocs').resolves({ rows: [
      { doc: { _id: 'ok-1', parent: { _id: 'hc-a' } } },
      { doc: { _id: 'changed', parent: { _id: 'moved-since' } } },
      { doc: { _id: 'ok-2', parent: { _id: 'hc-a' } } },
    ] });
    const bulkDocs = sinon.stub(db.medic, 'bulkDocs').resolves([ { ok: true }, { ok: true } ]);

    const failed = await setParent([
      { id: 'ok-1', parent: { _id: 'hc-b' }, current_parent_id: 'hc-a' },
      { id: 'changed', parent: { _id: 'hc-b' }, current_parent_id: 'hc-a' },
      { id: 'ok-2', parent: { _id: 'hc-b' }, current_parent_id: 'hc-a' },
    ], 'action-1');

    expect(failed.map(op => op.id)).to.deep.equal([ 'changed' ]);
    expect(bulkDocs.args[0][0].map(d => d._id)).to.deep.equal([ 'ok-1', 'ok-2' ]);
  });
});
