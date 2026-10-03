const sinon = require('sinon');
const { expect } = require('chai');

const db = require('../../../../src/db');
const { setContact } = require('../../../../src/lib/bulk-operations/set-contact');

describe('bulk-operations set-contact handler', () => {
  afterEach(() => sinon.restore());

  it('applies matching operations and returns no failures', async () => {
    const batch = [
      { id: 'place-1', contact: { _id: 'new-1' }, current_contact_id: 'old-1' },
      { id: 'place-2', current_contact_id: 'old-2' }, // no `contact` means clear it
    ];
    sinon.stub(db.medic, 'allDocs').resolves({ rows: [
      { doc: { _id: 'place-1', contact: { _id: 'old-1' } } },
      { doc: { _id: 'place-2', contact: 'old-2' } },
    ] });
    const bulkDocs = sinon.stub(db.medic, 'bulkDocs').resolves([ { ok: true }, { ok: true } ]);

    const failed = await setContact(batch, 'action-1');

    expect(failed).to.deep.equal([]);
    const updated = bulkDocs.args[0][0];
    expect(updated.find(d => d._id === 'place-1').contact).to.deep.equal({ _id: 'new-1' });
    expect(updated.find(d => d._id === 'place-2').contact).to.be.undefined;
  });

  it('fails an operation whose write is rejected by couch', async () => {
    sinon.stub(db.medic, 'allDocs').resolves({ rows: [
      { doc: { _id: 'place-1', contact: { _id: 'old-1' } } },
    ] });
    sinon.stub(db.medic, 'bulkDocs').resolves([ { id: 'place-1', error: 'conflict' } ]);

    const failed = await setContact(
      [ { id: 'place-1', contact: { _id: 'new-1' }, current_contact_id: 'old-1' } ],
      'action-1'
    );

    expect(failed.map(op => op.id)).to.deep.equal([ 'place-1' ]);
  });

  it('fails an operation whose doc is missing', async () => {
    sinon.stub(db.medic, 'allDocs').resolves({ rows: [ { key: 'gone', error: 'not_found' } ] });
    const bulkDocs = sinon.stub(db.medic, 'bulkDocs').resolves([]);

    const failed = await setContact([ { id: 'gone', current_contact_id: 'old' } ], 'action-1');

    expect(failed.map(op => op.id)).to.deep.equal([ 'gone' ]);
    expect(bulkDocs.called).to.equal(false);
  });

  it('fails an operation whose contact has changed since it was queued', async () => {
    sinon.stub(db.medic, 'allDocs').resolves({ rows: [
      { doc: { _id: 'place-1', contact: { _id: 'changed-since' } } },
    ] });
    const bulkDocs = sinon.stub(db.medic, 'bulkDocs').resolves([]);

    const failed = await setContact(
      [ { id: 'place-1', contact: { _id: 'new' }, current_contact_id: 'old-1' } ],
      'action-1'
    );

    expect(failed.map(op => op.id)).to.deep.equal([ 'place-1' ]);
    expect(bulkDocs.called).to.equal(false);
  });

  it('fails an operation with no id without querying', async () => {
    const allDocs = sinon.stub(db.medic, 'allDocs').resolves({ rows: [] });
    sinon.stub(db.medic, 'bulkDocs').resolves([]);

    const failed = await setContact([ { current_contact_id: 'x' } ], 'action-1');

    expect(failed).to.have.length(1);
    expect(allDocs.called).to.equal(false);
  });
});
