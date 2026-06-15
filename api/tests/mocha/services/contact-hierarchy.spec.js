const sinon = require('sinon');
const { expect } = require('chai');
const db = require('../../../src/db');
const dataContext = require('../../../src/services/data-context');
const service = require('../../../src/services/contact-hierarchy');

const CONTACTS_BY_DEPTH = 'medic/contacts_by_depth';
const REPORTS_BY_SUBJECT = 'medic-client/reports_by_subject';

const contactDoc = (id, extra = {}) => ({ _id: id, _rev: '1-abc', type: 'person', ...extra });
const reportDoc = (id) => ({ _id: id, _rev: '1-abc', type: 'data_record', form: 'assessment' });
const contactRow = (doc) => ({ id: doc._id, key: [doc._id], doc });
const reportRow = (doc) => ({ id: doc._id, key: 'subject', doc });

describe('contact-hierarchy service', () => {
  let query;
  let bulkDocs;
  let allDocs;

  beforeEach(() => {
    query = sinon.stub(db.medic, 'query');
    bulkDocs = sinon.stub(db.medic, 'bulkDocs').resolves([]);
    // Conflict retries re-fetch fresh revisions; return a minimal live doc for any id.
    allDocs = sinon.stub(db.medic, 'allDocs').callsFake(({ keys }) => Promise.resolve({
      rows: keys.map(id => ({ id, doc: { _id: id, _rev: '9-fresh' } })),
    }));
    sinon.stub(dataContext, 'bind').returns(sinon.stub().resolves(undefined));
  });

  afterEach(() => sinon.restore());

  const stubSubtree = (docs) => query
    .withArgs(CONTACTS_BY_DEPTH, sinon.match({ include_docs: true }))
    .resolves({ rows: docs.map(contactRow) });

  // For guard tests we only care about the subtree row count, not the doc bodies.
  const stubSubtreeRows = (count) => query
    .withArgs(CONTACTS_BY_DEPTH, sinon.match({ include_docs: true }))
    .resolves({ rows: new Array(count).fill({ id: 'x', key: ['x'] }) });

  const stubReports = (docs) => query
    .withArgs(REPORTS_BY_SUBJECT, sinon.match.any)
    .resolves({ rows: docs.map(reportRow) });

  // bulkDocs returns one result per input doc; conflict for the given ids until `healAfter`.
  const stubConflicts = (conflictIds, { healAfter = Infinity } = {}) => {
    let call = 0;
    bulkDocs.callsFake((docs) => {
      call += 1;
      return Promise.resolve(docs.map((doc) => {
        const stillConflicts = conflictIds.includes(doc._id) && call < healAfter;
        return stillConflicts
          ? { id: doc._id, error: 'conflict', reason: 'Document update conflict' }
          : { id: doc._id, ok: true };
      }));
    });
  };

  describe('deleteHierarchy', () => {
    it('returns null when the contact does not exist', async () => {
      stubSubtreeRows(0);

      const result = await service.deleteHierarchy('missing');

      expect(result).to.be.null;
      expect(bulkDocs.called).to.be.false;
    });

    it('rejects with code 400 when the subtree exceeds the size guard', async () => {
      stubSubtreeRows(5001);

      try {
        await service.deleteHierarchy('huge', { recursive: true });
        expect.fail('expected deleteHierarchy to throw');
      } catch (err) {
        expect(err.code).to.equal(400);
        expect(err.message).to.contain('too large');
      }
      expect(bulkDocs.called).to.be.false;
    });

    it('deletes a single contact with no children or reports', async () => {
      stubSubtree([contactDoc('c1', { patient_id: 'SC1' })]);
      stubReports([]);

      const result = await service.deleteHierarchy('c1');

      expect(result).to.deep.equal({ deleted_contacts: 1, deleted_reports: 0, errors: [] });
      expect(bulkDocs.calledOnce).to.be.true;
      const written = bulkDocs.firstCall.args[0];
      expect(written).to.have.length(1);
      expect(written[0]._id).to.equal('c1');
      expect(written[0]._deleted).to.be.true;
    });

    it('rejects with code 400 when the contact has descendants and recursive is not set', async () => {
      stubSubtreeRows(3);

      try {
        await service.deleteHierarchy('root');
        expect.fail('expected deleteHierarchy to throw');
      } catch (err) {
        expect(err.code).to.equal(400);
        expect(err.message).to.contain('recursive=true');
      }
      expect(bulkDocs.called).to.be.false;
    });

    it('recursively deletes the contact and all of its descendants', async () => {
      stubSubtree([contactDoc('root'), contactDoc('child1'), contactDoc('child2')]);
      stubReports([]);

      const result = await service.deleteHierarchy('root', { recursive: true });

      expect(result.deleted_contacts).to.equal(3);
      const written = bulkDocs.firstCall.args[0];
      expect(written.map(doc => doc._id)).to.have.members(['root', 'child1', 'child2']);
      expect(written.every(doc => doc._deleted)).to.be.true;
    });

    it('filters out tombstone documents from the subtree', async () => {
      query
        .withArgs(CONTACTS_BY_DEPTH, sinon.match({ include_docs: true }))
        .resolves({ rows: [
          contactRow(contactDoc('root')),
          contactRow({ _id: 'old', _rev: '2-abc', type: 'tombstone' }),
        ] });
      stubReports([]);

      const result = await service.deleteHierarchy('root', { recursive: true });

      expect(result.deleted_contacts).to.equal(1);
      expect(bulkDocs.firstCall.args[0].map(doc => doc._id)).to.deep.equal(['root']);
    });

    it('queries reports_by_subject by contact uuid only, and dedupes reports', async () => {
      const report = reportDoc('r1');
      stubSubtree([contactDoc('c1', { patient_id: 'SC1' })]);
      // same report emitted under more than one key
      query
        .withArgs(REPORTS_BY_SUBJECT, sinon.match.any)
        .resolves({ rows: [reportRow(report), reportRow(report)] });

      const result = await service.deleteHierarchy('c1');

      expect(result.deleted_reports).to.equal(1);
      const keys = query.withArgs(REPORTS_BY_SUBJECT, sinon.match.any).firstCall.args[1].keys;
      expect(keys).to.include('c1');
      expect(keys).to.not.include('SC1');
      expect(bulkDocs.firstCall.args[0].map(doc => doc._id)).to.have.members(['c1', 'r1']);
    });

    it('pages through reports_by_subject until a short page is returned', async () => {
      stubSubtree([contactDoc('c1')]);
      const firstPage = [];
      for (let i = 0; i < 100; i++) {
        firstPage.push(reportDoc(`r${i}`));
      }
      const secondPage = [reportDoc('r100'), reportDoc('r101')];
      const reportsQuery = query.withArgs(REPORTS_BY_SUBJECT, sinon.match.any);
      reportsQuery.onFirstCall().resolves({ rows: firstPage.map(reportRow) });
      reportsQuery.onSecondCall().resolves({ rows: secondPage.map(reportRow) });

      const result = await service.deleteHierarchy('c1');

      expect(result.deleted_reports).to.equal(102);
      expect(reportsQuery.firstCall.args[1].skip).to.equal(0);
      expect(reportsQuery.secondCall.args[1].skip).to.equal(100);
    });

    it('retries a conflicting write with a fresh revision and then succeeds', async () => {
      stubSubtree([contactDoc('c1')]);
      stubReports([]);
      stubConflicts(['c1'], { healAfter: 2 });

      const result = await service.deleteHierarchy('c1');

      expect(result.deleted_contacts).to.equal(1);
      expect(result.errors).to.deep.equal([]);
      expect(bulkDocs.callCount).to.equal(2);
      expect(allDocs.calledOnce).to.be.true;
    });

    it('surfaces a conflict that persists past the retry limit and excludes it from the counts', async () => {
      stubSubtree([contactDoc('c1')]);
      stubReports([]);
      stubConflicts(['c1']);

      const result = await service.deleteHierarchy('c1');

      expect(result.errors).to.deep.equal([
        { _id: 'c1', error: 'conflict', reason: 'Document update conflict' },
      ]);
      expect(result.deleted_contacts).to.equal(0);
      expect(bulkDocs.callCount).to.equal(3);
    });

    it('reports only the documents that were actually deleted when a write fails', async () => {
      stubSubtree([contactDoc('root'), contactDoc('child')]);
      stubReports([reportDoc('r1')]);
      stubConflicts(['child']);

      const result = await service.deleteHierarchy('root', { recursive: true });

      expect(result.deleted_contacts).to.equal(1);
      expect(result.deleted_reports).to.equal(1);
      expect(result.errors).to.have.length(1);
    });

    it('clears the primary-contact reference on a deleted contact\'s surviving parent', async () => {
      stubSubtree([contactDoc('chw', { parent: { _id: 'hca' } })]);
      stubReports([]);
      const parent = { _id: 'hca', _rev: '1-abc', type: 'health_center', contact: { _id: 'chw' } };
      dataContext.bind.returns(sinon.stub().resolves(parent));

      await service.deleteHierarchy('chw');

      const written = bulkDocs.firstCall.args[0];
      const writtenParent = written.find(doc => doc._id === 'hca');
      expect(writtenParent).to.exist;
      expect(writtenParent.contact).to.be.null;
      expect(writtenParent._deleted).to.be.undefined;
    });

    it('leaves a parent untouched when its primary contact is not being deleted', async () => {
      stubSubtree([contactDoc('chw', { parent: { _id: 'hca' } })]);
      stubReports([]);
      const parent = { _id: 'hca', _rev: '1-abc', type: 'health_center', contact: { _id: 'someone-else' } };
      dataContext.bind.returns(sinon.stub().resolves(parent));

      await service.deleteHierarchy('chw');

      expect(bulkDocs.firstCall.args[0].map(doc => doc._id)).to.deep.equal(['chw']);
    });

    it('does not write a parent that is itself being deleted', async () => {
      stubSubtree([
        contactDoc('place', { type: 'clinic', parent: { _id: 'hc' }, contact: { _id: 'person' } }),
        contactDoc('person', { parent: { _id: 'place' } }),
      ]);
      stubReports([]);
      // the deleted person is the primary contact of the deleted place
      const place = { _id: 'place', _rev: '1-abc', type: 'clinic', contact: { _id: 'person' } };
      dataContext.bind.returns(sinon.stub().resolves(place));

      await service.deleteHierarchy('place', { recursive: true });

      const written = bulkDocs.firstCall.args[0];
      expect(written.filter(doc => doc._id === 'place')).to.have.length(1);
      expect(written.every(doc => doc._deleted)).to.be.true;
    });

    it('writes in batches of 100 documents', async () => {
      const docs = [];
      for (let i = 0; i < 150; i++) {
        docs.push(contactDoc(`c${i}`));
      }
      stubSubtree(docs);
      stubReports([]);

      await service.deleteHierarchy('c0', { recursive: true });

      expect(bulkDocs.callCount).to.equal(2);
      expect(bulkDocs.firstCall.args[0]).to.have.length(100);
      expect(bulkDocs.secondCall.args[0]).to.have.length(50);
    });
  });
});
