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

  beforeEach(() => {
    query = sinon.stub(db.medic, 'query');
    bulkDocs = sinon.stub(db.medic, 'bulkDocs').resolves([]);
    sinon.stub(dataContext, 'bind').returns(sinon.stub().resolves(undefined));
  });

  afterEach(() => sinon.restore());

  // count query omits include_docs; subtree query sets it.
  const stubCount = (count) => query
    .withArgs(CONTACTS_BY_DEPTH, sinon.match(opts => !opts.include_docs))
    .resolves({ rows: new Array(count).fill({ id: 'x', key: ['x'] }) });

  const stubSubtree = (docs) => query
    .withArgs(CONTACTS_BY_DEPTH, sinon.match({ include_docs: true }))
    .resolves({ rows: docs.map(contactRow) });

  const stubReports = (docs) => query
    .withArgs(REPORTS_BY_SUBJECT, sinon.match.any)
    .resolves({ rows: docs.map(reportRow) });

  describe('deleteHierarchy', () => {
    it('returns null when the contact does not exist', async () => {
      stubCount(0);

      const result = await service.deleteHierarchy('missing');

      expect(result).to.be.null;
      expect(bulkDocs.called).to.be.false;
    });

    it('rejects with code 400 when the subtree exceeds the size guard', async () => {
      stubCount(5001);

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
      stubCount(1);
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
      stubCount(3);

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
      stubCount(3);
      stubSubtree([contactDoc('root'), contactDoc('child1'), contactDoc('child2')]);
      stubReports([]);

      const result = await service.deleteHierarchy('root', { recursive: true });

      expect(result.deleted_contacts).to.equal(3);
      const written = bulkDocs.firstCall.args[0];
      expect(written.map(doc => doc._id)).to.have.members(['root', 'child1', 'child2']);
      expect(written.every(doc => doc._deleted)).to.be.true;
    });

    it('filters out tombstone documents from the subtree', async () => {
      stubCount(2);
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

    it('queries reports_by_subject by both uuid and shortcode, and dedupes reports', async () => {
      const report = reportDoc('r1');
      stubCount(1);
      stubSubtree([contactDoc('c1', { patient_id: 'SC1' })]);
      // same report emitted under both the uuid key and the shortcode key
      query
        .withArgs(REPORTS_BY_SUBJECT, sinon.match.any)
        .resolves({ rows: [reportRow(report), reportRow(report)] });

      const result = await service.deleteHierarchy('c1');

      expect(result.deleted_reports).to.equal(1);
      const keys = query.withArgs(REPORTS_BY_SUBJECT, sinon.match.any).firstCall.args[1].keys;
      expect(keys).to.include('c1');
      expect(keys).to.include('SC1');
      expect(bulkDocs.firstCall.args[0].map(doc => doc._id)).to.have.members(['c1', 'r1']);
    });

    it('surfaces per-document bulkDocs errors in the response', async () => {
      stubCount(1);
      stubSubtree([contactDoc('c1')]);
      stubReports([]);
      bulkDocs.resolves([{ id: 'c1', error: 'conflict', reason: 'Document update conflict' }]);

      const result = await service.deleteHierarchy('c1');

      expect(result.errors).to.deep.equal([
        { _id: 'c1', error: 'conflict', reason: 'Document update conflict' },
      ]);
    });

    it('clears the primary-contact reference on a deleted contact\'s surviving parent', async () => {
      stubCount(1);
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
      stubCount(1);
      stubSubtree([contactDoc('chw', { parent: { _id: 'hca' } })]);
      stubReports([]);
      const parent = { _id: 'hca', _rev: '1-abc', type: 'health_center', contact: { _id: 'someone-else' } };
      dataContext.bind.returns(sinon.stub().resolves(parent));

      await service.deleteHierarchy('chw');

      expect(bulkDocs.firstCall.args[0].map(doc => doc._id)).to.deep.equal(['chw']);
    });

    it('does not write a parent that is itself being deleted', async () => {
      stubCount(2);
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
      stubCount(150);
      stubSubtree(docs);
      stubReports([]);

      await service.deleteHierarchy('c0', { recursive: true });

      expect(bulkDocs.callCount).to.equal(2);
      expect(bulkDocs.firstCall.args[0]).to.have.length(100);
      expect(bulkDocs.secondCall.args[0]).to.have.length(50);
    });
  });
});
