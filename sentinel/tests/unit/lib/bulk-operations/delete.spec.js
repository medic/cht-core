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
    purgeDocs = sinon.stub(archiving, 'purgeDocs').resolves();
  });

  afterEach(() => sinon.restore());

  it('copies the docs to the delete database, purges the infodocs, then deletes from medic', async () => {
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
    expect(purgeDocs.calledBefore(db.medic.bulkDocs)).to.equal(true);
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

  it('counts an already deleted doc as done, so a retried batch is not reported as failed', async () => {
    // What a batch sees when Sentinel stopped after deleting but before saving its cursor.
    db.medic.allDocs.resolves({ rows: [
      { key: 'a', id: 'a', value: { rev: '2-aaa', deleted: true } },
      { doc: report },
    ] });
    db.medic.bulkDocs.resolves([ { ok: true, id: 'b' } ]);

    const failed = await deleteDocs([ { id: 'a' }, { id: 'b' } ], 'action-1');

    expect(failed).to.deep.equal([]);
    expect(db.deleted.bulkDocs.args[0][0].map(doc => doc._id)).to.deep.equal([ 'b' ]);
    expect(db.medic.bulkDocs.args[0][0]).to.deep.equal([ { _id: 'b', _rev: '1-bbb', _deleted: true } ]);
  });

  it('does nothing at all when every doc in a retried batch is already deleted', async () => {
    db.medic.allDocs.resolves({ rows: [ { key: 'a', id: 'a', value: { rev: '2-aaa', deleted: true } } ] });

    const failed = await deleteDocs([ { id: 'a' } ], 'action-1');

    expect(failed).to.deep.equal([]);
    expect(db.deleted.bulkDocs.called).to.equal(false);
    expect(db.medic.bulkDocs.called).to.equal(false);
  });
});
