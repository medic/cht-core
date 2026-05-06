const sinon = require('sinon');
const { expect } = require('chai');
const db = require('../../../src/db');

describe('Contact Delete Service', () => {
  let service;

  before(() => {
    service = require('../../../src/services/contact-delete');
  });

  afterEach(() => {
    sinon.restore();
  });

  const makeContactRow = (id, shortcode) => ({
    id,
    key: [id],
    doc: { _id: id, _rev: '1-abc', type: 'person', patient_id: shortcode },
  });

  const makeReportRow = (id) => ({
    id,
    key: id,
    doc: { _id: id, _rev: '1-abc', type: 'data_record', form: 'death' },
  });

  describe('deleteContact', () => {
    it('returns null when contact does not exist', async () => {
      sinon.stub(db.medic, 'query').resolves({ rows: [] });

      const result = await service.deleteContact('unknown-uuid');

      expect(result).to.be.null;
      expect(db.medic.query.calledOnce).to.be.true;
    });

    it('deletes a single contact with no children or reports', async () => {
      const query = sinon.stub(db.medic, 'query');
      const bulkDocs = sinon.stub(db.medic, 'bulkDocs').resolves([{ ok: true }]);

      // contacts_by_depth returns just the contact itself
      query.withArgs('medic/contacts_by_depth', sinon.match({ startkey: ['contact-1'] }))
        .resolves({ rows: [makeContactRow('contact-1', 'SC001')] });

      // reports_by_subject returns no linked reports
      query.withArgs('medic-client/reports_by_subject', sinon.match.any)
        .resolves({ rows: [] });

      const result = await service.deleteContact('contact-1');

      expect(result).to.deep.equal({ deleted: { contacts: 1, reports: 0 } });
      expect(bulkDocs.calledOnce).to.be.true;
      const deletedDocs = bulkDocs.firstCall.args[0];
      expect(deletedDocs).to.have.length(1);
      expect(deletedDocs[0]._deleted).to.be.true;
      expect(deletedDocs[0]._id).to.equal('contact-1');
    });

    it('recursively deletes a contact and all its descendants', async () => {
      const query = sinon.stub(db.medic, 'query');
      const bulkDocs = sinon.stub(db.medic, 'bulkDocs').resolves([
        { ok: true }, { ok: true }, { ok: true },
      ]);

      // contacts_by_depth returns parent + 2 children
      // each contact appears twice (with and without depth key), deduplication must handle this
      const parentRow = makeContactRow('parent-uuid', 'SC-P');
      const child1Row = makeContactRow('child-1', 'SC-C1');
      const child2Row = makeContactRow('child-2', undefined);
      const child1RowDuplicate = { ...child1Row, key: ['parent-uuid', 1] };

      query.withArgs('medic/contacts_by_depth', sinon.match({ startkey: ['parent-uuid'] }))
        .resolves({ rows: [parentRow, child1Row, child1RowDuplicate, child2Row] });

      query.withArgs('medic-client/reports_by_subject', sinon.match.any)
        .resolves({ rows: [] });

      const result = await service.deleteContact('parent-uuid');

      expect(result).to.deep.equal({ deleted: { contacts: 3, reports: 0 } });
      const deletedDocs = bulkDocs.firstCall.args[0];
      // child-1 should appear only once despite two rows in view result
      expect(deletedDocs).to.have.length(3);
      expect(deletedDocs.map(d => d._id)).to.include.members(['parent-uuid', 'child-1', 'child-2']);
    });

    it('deletes linked reports alongside contacts', async () => {
      const query = sinon.stub(db.medic, 'query');
      const bulkDocs = sinon.stub(db.medic, 'bulkDocs').resolves([
        { ok: true }, { ok: true },
      ]);

      query.withArgs('medic/contacts_by_depth', sinon.match.any)
        .resolves({ rows: [makeContactRow('contact-uuid', 'SC001')] });

      query.withArgs('medic-client/reports_by_subject', sinon.match.any)
        .resolves({ rows: [makeReportRow('report-uuid')] });

      const result = await service.deleteContact('contact-uuid');

      expect(result).to.deep.equal({ deleted: { contacts: 1, reports: 1 } });

      // reports_by_subject must be queried with the contact uuid AND shortcode
      const subjectKeys = query.secondCall.args[1].keys;
      expect(subjectKeys).to.include('contact-uuid');
      expect(subjectKeys).to.include('SC001');

      const deletedDocs = bulkDocs.firstCall.args[0];
      expect(deletedDocs).to.have.length(2);
      expect(deletedDocs.every(d => d._deleted)).to.be.true;
    });

    it('deduplicates reports that appear in multiple subject key results', async () => {
      const query = sinon.stub(db.medic, 'query');
      sinon.stub(db.medic, 'bulkDocs').resolves([{ ok: true }, { ok: true }]);

      query.withArgs('medic/contacts_by_depth', sinon.match.any)
        .resolves({ rows: [makeContactRow('contact-uuid', 'SC001')] });

      const reportRow = makeReportRow('report-uuid');
      // same report returned for both uuid and shortcode key
      query.withArgs('medic-client/reports_by_subject', sinon.match.any)
        .resolves({ rows: [reportRow, reportRow] });

      const result = await service.deleteContact('contact-uuid');

      expect(result).to.deep.equal({ deleted: { contacts: 1, reports: 1 } });
    });

    it('throws when bulkDocs returns errors', async () => {
      const query = sinon.stub(db.medic, 'query');
      sinon.stub(db.medic, 'bulkDocs').resolves([{ error: 'conflict', id: 'contact-uuid' }]);

      query.withArgs('medic/contacts_by_depth', sinon.match.any)
        .resolves({ rows: [makeContactRow('contact-uuid', undefined)] });

      query.withArgs('medic-client/reports_by_subject', sinon.match.any)
        .resolves({ rows: [] });

      await expect(service.deleteContact('contact-uuid')).to.be.rejectedWith('Failed to delete 1 document(s)');
    });

    it('skips contacts without shortcodes when building report query keys', async () => {
      const query = sinon.stub(db.medic, 'query');
      sinon.stub(db.medic, 'bulkDocs').resolves([{ ok: true }]);

      // contact has no patient_id or place_id
      query.withArgs('medic/contacts_by_depth', sinon.match.any)
        .resolves({ rows: [makeContactRow('contact-uuid', undefined)] });

      query.withArgs('medic-client/reports_by_subject', sinon.match.any)
        .resolves({ rows: [] });

      await service.deleteContact('contact-uuid');

      const subjectKeys = query.secondCall.args[1].keys;
      // only the UUID, no shortcode
      expect(subjectKeys).to.deep.equal(['contact-uuid']);
    });
  });
});
