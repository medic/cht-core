const chai = require('chai');
const sinon = require('sinon');

const db = require('../../../../src/db');
const setContact = require('../../../../src/lib/bulk-operations/set-contact');

const expect = chai.expect;

describe('bulk-operations set-contact handler', () => {
  afterEach(() => sinon.restore());

  it('applies matching operations and returns no failures', () => {
    const batch = [
      { id: 'place-1', contact: { _id: 'new-1' }, current_contact_id: 'old-1' },
      { id: 'place-2', current_contact_id: 'old-2' }, // no `contact` means clear it
    ];
    sinon.stub(db.medic, 'allDocs').resolves({ rows: [
      { doc: { _id: 'place-1', contact: { _id: 'old-1' } } },
      { doc: { _id: 'place-2', contact: 'old-2' } },
    ] });
    const bulkDocs = sinon.stub(db.medic, 'bulkDocs').resolves();

    return setContact(batch, 'action-1').then(failed => {
      expect(failed).to.deep.equal([]);
      const updated = bulkDocs.args[0][0];
      expect(updated.find(d => d._id === 'place-1').contact).to.deep.equal({ _id: 'new-1' });
      expect(updated.find(d => d._id === 'place-2').contact).to.be.undefined;
    });
  });

  it('fails an operation whose doc is missing', () => {
    sinon.stub(db.medic, 'allDocs').resolves({ rows: [ { key: 'gone', error: 'not_found' } ] });
    const bulkDocs = sinon.stub(db.medic, 'bulkDocs').resolves();

    return setContact([ { id: 'gone', current_contact_id: 'old' } ], 'action-1').then(failed => {
      expect(failed.map(op => op.id)).to.deep.equal([ 'gone' ]);
      expect(bulkDocs.called).to.equal(false);
    });
  });

  it('fails an operation whose contact has changed since it was queued', () => {
    sinon.stub(db.medic, 'allDocs').resolves({ rows: [
      { doc: { _id: 'place-1', contact: { _id: 'changed-since' } } },
    ] });
    const bulkDocs = sinon.stub(db.medic, 'bulkDocs').resolves();

    return setContact([ { id: 'place-1', contact: { _id: 'new' }, current_contact_id: 'old-1' } ], 'action-1')
      .then(failed => {
        expect(failed.map(op => op.id)).to.deep.equal([ 'place-1' ]);
        expect(bulkDocs.called).to.equal(false);
      });
  });

  it('fails an operation with no id without querying', () => {
    const allDocs = sinon.stub(db.medic, 'allDocs').resolves({ rows: [] });
    sinon.stub(db.medic, 'bulkDocs').resolves();

    return setContact([ { current_contact_id: 'x' } ], 'action-1').then(failed => {
      expect(failed).to.have.length(1);
      expect(allDocs.called).to.equal(false);
    });
  });
});
