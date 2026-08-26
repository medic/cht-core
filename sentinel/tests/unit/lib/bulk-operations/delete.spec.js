const sinon = require('sinon');
const { expect } = require('chai');

const db = require('../../../../src/db');
const archiving = require('../../../../src/lib/archiving');
const { deleteDocs } = require('../../../../src/lib/bulk-operations/delete');

const contact = { _id: 'a', _rev: '1-aaa', type: 'person', name: 'Ann' };
const report = { _id: 'b', _rev: '1-bbb', type: 'data_record', form: 'x' };

describe('bulk-operations delete handler', () => {
  let purgeDocs;

  beforeEach(() => {
    sinon.stub(db.medic, 'allDocs').resolves({ rows: [ { doc: contact }, { doc: report } ] });
    sinon.stub(db.medic, 'bulkDocs').resolves([ { ok: true, id: 'a' }, { ok: true, id: 'b' } ]);
    sinon.stub(db.deleted, 'bulkDocs').resolves([]);
    // an already deleted row is only a success when a copy was kept, so the copy db is read too
    sinon.stub(db.deleted, 'allDocs').resolves({ rows: [] });
    purgeDocs = sinon.stub(archiving, 'purgeDocs').resolves();
  });

  afterEach(() => sinon.restore());

  it('copies the docs, deletes them from medic, then purges the infodocs', async () => {
    const failed = await deleteDocs([ { id: 'a' }, { id: 'b' } ], 'action-1');

    expect(failed).to.deep.equal([]);

    // fetched with attachments so the copy is complete, and with conflicts so every leaf can go
    expect(db.medic.allDocs.args[0][0]).to.deep.equal({
      keys: [ 'a', 'b' ],
      include_docs: true,
      attachments: true,
      conflicts: true,
    });

    const [ copies, options ] = db.deleted.bulkDocs.args[0];
    expect(options).to.deep.equal({ new_edits: false });
    expect(copies.map(doc => doc._id)).to.deep.equal([ 'a', 'b' ]);
    expect(copies[0]._rev).to.equal('1-aaa');
    expect(copies.every(doc => typeof doc.deleted_date === 'number')).to.equal(true);

    expect(purgeDocs.args[0][0]).to.equal(db.sentinel);
    expect(purgeDocs.args[0][1]).to.deep.equal([ 'a-info', 'b-info' ]);

    // deleted rather than purged, so the tombstone still replicates
    expect(db.medic.bulkDocs.args[0][0]).to.deep.equal([
      { _id: 'a', _rev: '1-aaa', _deleted: true },
      { _id: 'b', _rev: '1-bbb', _deleted: true },
    ]);
  });

  it('copies the docs before deleting them, so a crash cannot lose the doc', async () => {
    await deleteDocs([ { id: 'a' } ], 'action-1');

    expect(db.deleted.bulkDocs.calledBefore(db.medic.bulkDocs)).to.equal(true);
    // and the infodocs go last, once we know which docs actually went
    expect(db.medic.bulkDocs.calledBefore(purgeDocs)).to.equal(true);
  });

  it('deletes every live leaf, so a conflict is not promoted to winner', async () => {
    db.medic.allDocs.resolves({ rows: [ { doc: { ...contact, _conflicts: [ '1-ccc', '1-ddd' ] } } ] });
    db.medic.bulkDocs.resolves([ { ok: true, id: 'a' }, { ok: true, id: 'a' }, { ok: true, id: 'a' } ]);

    await deleteDocs([ { id: 'a' } ], 'action-1');

    expect(db.medic.bulkDocs.args[0][0]).to.deep.equal([
      { _id: 'a', _rev: '1-aaa', _deleted: true },
      { _id: 'a', _rev: '1-ccc', _deleted: true },
      { _id: 'a', _rev: '1-ddd', _deleted: true },
    ]);
  });

  it('does not store the query time _conflicts field on the copy', async () => {
    db.medic.allDocs.resolves({ rows: [ { doc: { ...contact, _conflicts: [ '1-ccc' ] } } ] });
    db.medic.bulkDocs.resolves([ { ok: true, id: 'a' }, { ok: true, id: 'a' } ]);

    await deleteDocs([ { id: 'a' } ], 'action-1');

    expect(db.deleted.bulkDocs.args[0][0][0]).to.not.have.property('_conflicts');
  });

  it('fails an operation with no id without touching the rest', async () => {
    db.medic.allDocs.resolves({ rows: [ { doc: contact } ] });
    db.medic.bulkDocs.resolves([ { ok: true, id: 'a' } ]);

    const failed = await deleteDocs([ {}, { id: 'a' } ], 'action-1');

    expect(failed).to.deep.equal([ {} ]);
    expect(db.medic.allDocs.args[0][0].keys).to.deep.equal([ 'a' ]);
  });

  it('does nothing when the batch has no ids at all', async () => {
    const failed = await deleteDocs([ {} ], 'action-1');

    expect(failed).to.have.length(1);
    expect(db.medic.allDocs.called).to.equal(false);
    expect(db.deleted.bulkDocs.called).to.equal(false);
  });

  it('fails a missing doc and still deletes the others', async () => {
    db.medic.allDocs.resolves({ rows: [ { key: 'gone', error: 'not_found' }, { doc: report } ] });
    db.medic.bulkDocs.resolves([ { ok: true, id: 'b' } ]);

    const failed = await deleteDocs([ { id: 'gone' }, { id: 'b' } ], 'action-1');

    expect(failed).to.deep.equal([ { id: 'gone' } ]);
    expect(db.medic.bulkDocs.args[0][0]).to.deep.equal([ { _id: 'b', _rev: '1-bbb', _deleted: true } ]);
  });

  it('does not copy or delete anything when every id is missing', async () => {
    db.medic.allDocs.resolves({ rows: [ { key: 'gone', error: 'not_found' } ] });

    const failed = await deleteDocs([ { id: 'gone' } ], 'action-1');

    expect(failed).to.deep.equal([ { id: 'gone' } ]);
    expect(db.deleted.bulkDocs.called).to.equal(false);
    expect(db.medic.bulkDocs.called).to.equal(false);
  });

  it('reports a doc bulkDocs rejected individually, collapsed to one entry per doc', async () => {
    db.medic.allDocs.resolves({ rows: [ { doc: { ...contact, _conflicts: [ '1-ccc' ] } } ] });
    db.medic.bulkDocs.resolves([
      { id: 'a', error: 'conflict' },
      { id: 'a', error: 'conflict' },
    ]);

    const failed = await deleteDocs([ { id: 'a' } ], 'action-1');

    expect(failed).to.deep.equal([ { id: 'a' } ]);
  });

  it('fails the whole batch when the copy throws, leaving medic untouched', async () => {
    db.deleted.bulkDocs.rejects(new Error('boom'));

    const failed = await deleteDocs([ { id: 'a' }, { id: 'b' } ], 'action-1');

    expect(failed.map(op => op.id)).to.deep.equal([ 'a', 'b' ]);
    expect(db.medic.bulkDocs.called).to.equal(false);
  });

  it('still deletes when purging the infodocs fails, since background cleanup covers it', async () => {
    purgeDocs.rejects(new Error('boom'));

    const failed = await deleteDocs([ { id: 'a' }, { id: 'b' } ], 'action-1');

    expect(failed).to.deep.equal([]);
    expect(db.medic.bulkDocs.args[0][0]).to.deep.equal([
      { _id: 'a', _rev: '1-aaa', _deleted: true },
      { _id: 'b', _rev: '1-bbb', _deleted: true },
    ]);
  });

  it('does not delete a doc the delete database rejected, so the body is never dropped', async () => {
    // bulkDocs resolves with an error row rather than rejecting, and with new_edits: false only
    // failures come back.
    db.deleted.bulkDocs.resolves([ { id: 'a', error: 'forbidden' } ]);
    db.medic.bulkDocs.resolves([ { ok: true, id: 'b' } ]);

    const failed = await deleteDocs([ { id: 'a' }, { id: 'b' } ], 'action-1');

    expect(failed).to.deep.equal([ { id: 'a' } ]);
    expect(db.medic.bulkDocs.args[0][0]).to.deep.equal([ { _id: 'b', _rev: '1-bbb', _deleted: true } ]);
  });

  it('deletes nothing when every copy was rejected', async () => {
    db.deleted.bulkDocs.resolves([ { id: 'a', error: 'forbidden' }, { id: 'b', error: 'forbidden' } ]);

    const failed = await deleteDocs([ { id: 'a' }, { id: 'b' } ], 'action-1');

    expect(failed).to.deep.equal([ { id: 'a' }, { id: 'b' } ]);
    expect(db.medic.bulkDocs.called).to.equal(false);
  });

  it('counts an already deleted doc as done when the copy was kept, so a retry is not failed', async () => {
    // What a batch sees when Sentinel stopped after deleting but before saving its cursor.
    db.medic.allDocs.resolves({ rows: [
      { key: 'a', id: 'a', value: { rev: '2-aaa', deleted: true } },
      { doc: report },
    ] });
    db.deleted.allDocs.resolves({ rows: [ { key: 'a', id: 'a', value: { rev: '1-aaa' } } ] });
    db.medic.bulkDocs.resolves([ { ok: true, id: 'b' } ]);

    const failed = await deleteDocs([ { id: 'a' }, { id: 'b' } ], 'action-1');

    expect(failed).to.deep.equal([]);
    expect(db.deleted.allDocs.args[0][0]).to.deep.equal({ keys: [ 'a' ] });
    expect(db.deleted.bulkDocs.args[0][0].map(doc => doc._id)).to.deep.equal([ 'b' ]);
    expect(db.medic.bulkDocs.args[0][0]).to.deep.equal([ { _id: 'b', _rev: '1-bbb', _deleted: true } ]);
  });

  it('fails an already deleted doc when no copy was kept, since something else removed it', async () => {
    db.medic.allDocs.resolves({ rows: [ { key: 'a', id: 'a', value: { rev: '2-aaa', deleted: true } } ] });
    db.deleted.allDocs.resolves({ rows: [ { key: 'a', error: 'not_found' } ] });

    const failed = await deleteDocs([ { id: 'a' } ], 'action-1');

    expect(failed).to.deep.equal([ { id: 'a' } ]);
    expect(db.deleted.bulkDocs.called).to.equal(false);
    expect(db.medic.bulkDocs.called).to.equal(false);
  });

  it('does nothing at all when every doc in a retried batch is already deleted and kept', async () => {
    db.medic.allDocs.resolves({ rows: [ { key: 'a', id: 'a', value: { rev: '2-aaa', deleted: true } } ] });
    db.deleted.allDocs.resolves({ rows: [ { key: 'a', id: 'a', value: { rev: '1-aaa' } } ] });

    const failed = await deleteDocs([ { id: 'a' } ], 'action-1');

    expect(failed).to.deep.equal([]);
    expect(db.deleted.bulkDocs.called).to.equal(false);
    expect(db.medic.bulkDocs.called).to.equal(false);
  });

  // allDocs is called in a fixed order: read, check for survivors, and on a retry read again then
  // check again. Stubbing by call index keeps that visible.
  it('retries a doc that came back live, copying the new revision before deleting it', async () => {
    db.medic.allDocs.onCall(0).resolves({ rows: [ { doc: contact } ] });
    db.medic.allDocs.onCall(1).resolves({ rows: [ { key: 'a', id: 'a', value: { rev: '2-new' } } ] });
    db.medic.allDocs.onCall(2).resolves({ rows: [ { doc: { ...contact, _rev: '2-new' } } ] });
    db.medic.allDocs.onCall(3).resolves({ rows: [ { key: 'a', id: 'a', value: { rev: '3-x', deleted: true } } ] });

    const failed = await deleteDocs([ { id: 'a' } ], 'action-1');

    expect(failed).to.deep.equal([]);
    // the revision that appeared was copied before it was deleted
    expect(db.deleted.bulkDocs.callCount).to.equal(2);
    expect(db.deleted.bulkDocs.args[1][0][0]._rev).to.equal('2-new');
    expect(db.medic.bulkDocs.args[1][0]).to.deep.equal([ { _id: 'a', _rev: '2-new', _deleted: true } ]);
  });

  it('fails a doc that is still live after the retry rather than reporting success', async () => {
    db.medic.allDocs.onCall(0).resolves({ rows: [ { doc: contact } ] });
    db.medic.allDocs.onCall(1).resolves({ rows: [ { key: 'a', id: 'a', value: { rev: '2-new' } } ] });
    db.medic.allDocs.onCall(2).resolves({ rows: [ { doc: { ...contact, _rev: '2-new' } } ] });
    db.medic.allDocs.onCall(3).resolves({ rows: [ { key: 'a', id: 'a', value: { rev: '3-newer' } } ] });

    const failed = await deleteDocs([ { id: 'a' } ], 'action-1');

    expect(failed).to.deep.equal([ { id: 'a' } ]);
    // and the infodoc is left alone, since the doc is still there
    expect(purgeDocs.called).to.equal(false);
  });

  it('fails a retry copy that was rejected, even if the doc is gone by the final check', async () => {
    db.medic.allDocs.onCall(0).resolves({ rows: [ { doc: contact } ] });
    db.medic.allDocs.onCall(1).resolves({ rows: [ { key: 'a', id: 'a', value: { rev: '2-new' } } ] });
    db.medic.allDocs.onCall(2).resolves({ rows: [ { doc: { ...contact, _rev: '2-new' } } ] });
    // the copy of the new revision is refused
    db.deleted.bulkDocs.onCall(1).resolves([ { id: 'a', error: 'forbidden' } ]);
    // and something else deletes it before we look again
    db.medic.allDocs.onCall(3).resolves({ rows: [ { key: 'a', id: 'a', value: { rev: '3-x', deleted: true } } ] });

    const failed = await deleteDocs([ { id: 'a' } ], 'action-1');

    // gone, but we never kept that revision, so it is not a success
    expect(failed).to.deep.equal([ { id: 'a' } ]);
    expect(purgeDocs.called).to.equal(false);
  });

  it('does not retry when nothing came back live', async () => {
    db.medic.allDocs.onCall(0).resolves({ rows: [ { doc: contact } ] });
    db.medic.allDocs.onCall(1).resolves({ rows: [ { key: 'a', id: 'a', value: { rev: '2-x', deleted: true } } ] });

    const failed = await deleteDocs([ { id: 'a' } ], 'action-1');

    expect(failed).to.deep.equal([]);
    expect(db.deleted.bulkDocs.callCount).to.equal(1);
    expect(db.medic.bulkDocs.callCount).to.equal(1);
  });

  it('purges the infodoc only for docs that were actually deleted', async () => {
    // A doc updated between the read and the write fails on a conflict and must keep its infodoc,
    // otherwise its transition history is lost and a later edit looks like the first one.
    db.medic.bulkDocs.resolves([ { ok: true, id: 'a' }, { id: 'b', error: 'conflict' } ]);

    const failed = await deleteDocs([ { id: 'a' }, { id: 'b' } ], 'action-1');

    expect(failed).to.deep.equal([ { id: 'b' } ]);
    expect(purgeDocs.args[0][1]).to.deep.equal([ 'a-info' ]);
  });

  it('does not purge any infodoc when every delete failed', async () => {
    db.medic.bulkDocs.resolves([ { id: 'a', error: 'conflict' }, { id: 'b', error: 'conflict' } ]);

    await deleteDocs([ { id: 'a' }, { id: 'b' } ], 'action-1');

    expect(purgeDocs.called).to.equal(false);
  });
});
