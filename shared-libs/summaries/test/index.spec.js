const { expect } = require('chai');
const {
  summarise,
  summariseContact,
  summariseReport,
} = require('../src');

describe('summary lib', () => {
  describe('summariseReport', () => {
    it('summarises a report', () => {
      const doc = {
        _id: 'report-1',
        _rev: '1-abc',
        type: 'data_record',
        form: 'delivery',
        from: '+123',
        contact: {
          _id: 'c',
          phone: '+456',
          parent: { _id: 'd', parent: { _id: 'e' } },
        },
        verified: true,
        reported_date: 100,
        fields: { patient_name: 'jeff', patient_id: 'f' },
      };

      expect(summariseReport(doc)).to.deep.equal({
        _id: 'report-1',
        _rev: '1-abc',
        from: '+123',
        phone: '+456',
        form: 'delivery',
        read: undefined,
        valid: true,
        verified: true,
        reported_date: 100,
        contact: 'c',
        lineage: ['d', 'e'],
        subject: { name: 'jeff', value: 'f', type: 'reference' },
        case_id: undefined,
      });
    });

    it('uses sent_by when from is missing', () => {
      const doc = { _id: 'r1', _rev: '1', type: 'data_record', form: 'R', sent_by: '+321' };
      expect(summariseReport(doc).from).to.equal('+321');
    });

    it('marks invalid when errors present', () => {
      const doc = {
        _id: 'r1',
        _rev: '1',
        type: 'data_record',
        form: 'R',
        errors: [{ code: 'sys.missing_fields', fields: ['patient_id'] }],
      };
      expect(summariseReport(doc).valid).to.equal(false);
    });

    it('includes case_id from doc', () => {
      const doc = { _id: 'r1', _rev: '1', type: 'data_record', form: 'R', case_id: '12345' };
      expect(summariseReport(doc).case_id).to.equal('12345');
    });

    it('includes case_id from fields', () => {
      const doc = { _id: 'r1', _rev: '1', type: 'data_record', form: 'R', fields: { case_id: '67890' } };
      expect(summariseReport(doc).case_id).to.equal('67890');
    });

    describe('lineage', () => {
      it('is empty when the report contact has no parent', () => {
        const doc = { _id: 'r1', _rev: '1', type: 'data_record', form: 'R' };
        expect(summariseReport(doc).lineage).to.deep.equal([]);
      });

      it('contains the contact parent ids', () => {
        const doc = {
          _id: 'r1',
          _rev: '1',
          type: 'data_record',
          form: 'R',
          contact: { _id: 'c', parent: { _id: 'd', parent: { _id: 'e' } } },
        };
        expect(summariseReport(doc).lineage).to.deep.equal(['d', 'e']);
      });
    });

    describe('subject', () => {
      it('returns reference type for patient_id', () => {
        expect(summariseReport({ patient_id: '12345', fields: {} }).subject)
          .to.deep.equal({ value: '12345', type: 'reference' });
      });

      it('returns reference type for fields.patient_id', () => {
        expect(summariseReport({ fields: { patient_id: '12345' } }).subject)
          .to.deep.equal({ value: '12345', type: 'reference' });
      });

      it('returns reference type for fields.patient_uuid', () => {
        expect(summariseReport({ fields: { patient_uuid: 'uuid-123' } }).subject)
          .to.deep.equal({ value: 'uuid-123', type: 'reference' });
      });

      it('returns reference type for place_id', () => {
        expect(summariseReport({ place_id: 'place-1', fields: {} }).subject)
          .to.deep.equal({ value: 'place-1', type: 'reference' });
      });

      it('returns reference type for fields.place_id', () => {
        expect(summariseReport({ fields: { place_id: 'place-1' } }).subject)
          .to.deep.equal({ value: 'place-1', type: 'reference' });
      });

      it('includes patient_name when present with reference', () => {
        expect(summariseReport({ fields: { patient_id: '123', patient_name: 'jeff' } }).subject)
          .to.deep.equal({ name: 'jeff', value: '123', type: 'reference' });
      });

      it('returns name type when only patient_name', () => {
        expect(summariseReport({ fields: { patient_name: 'jeff' } }).subject)
          .to.deep.equal({ name: 'jeff', value: 'jeff', type: 'name' });
      });

      it('returns unknown type for missing subject errors', () => {
        const doc = { fields: {}, errors: [{ code: 'sys.missing_fields', fields: ['patient_id'] }] };
        expect(summariseReport(doc).subject).to.deep.equal({ type: 'unknown' });
      });

      it('returns empty object when no subject info', () => {
        expect(summariseReport({ fields: {} }).subject).to.deep.equal({});
      });

      it('returns empty object for non-missing-subject errors', () => {
        const doc = { fields: {}, errors: [{ code: 'other_error', fields: ['patient_id'] }] };
        expect(summariseReport(doc).subject).to.deep.equal({});
      });
    });
  });

  describe('summariseContact', () => {
    it('summarises a person contact', () => {
      const doc = {
        _id: 'person-1',
        _rev: '1-abc',
        type: 'person',
        name: 'james',
        phone: '+456',
        contact: { _id: 'c' },
        parent: { _id: 'f', parent: { _id: 'g' } },
        date_of_death: 999,
      };

      expect(summariseContact(doc)).to.deep.equal({
        _id: 'person-1',
        _rev: '1-abc',
        name: 'james',
        phone: '+456',
        type: 'person',
        contact_type: undefined,
        contact: 'c',
        lineage: ['f', 'g'],
        date_of_death: 999,
        muted: undefined,
      });
    });

    it('summarises a configurable contact', () => {
      const doc = {
        _id: 'contact-1',
        _rev: '2-def',
        type: 'contact',
        contact_type: 'patient',
        phone: '+123',
        parent: { _id: 'f', parent: { _id: 'g' } },
        muted: true,
      };

      expect(summariseContact(doc)).to.deep.equal({
        _id: 'contact-1',
        _rev: '2-def',
        name: '+123',
        phone: '+123',
        type: 'contact',
        contact_type: 'patient',
        contact: undefined,
        lineage: ['f', 'g'],
        date_of_death: undefined,
        muted: true,
      });
    });

    it('uses phone as name when name is missing', () => {
      const doc = { _id: 'c1', _rev: '1', type: 'person', phone: '0123456789' };
      expect(summariseContact(doc).name).to.equal('0123456789');
    });

    describe('lineage', () => {
      it('is empty when the contact has no parent', () => {
        const doc = { _id: 'c1', _rev: '1', type: 'person' };
        expect(summariseContact(doc).lineage).to.deep.equal([]);
      });

      it('skips ancestors without an _id', () => {
        const doc = { _id: 'c1', _rev: '1', type: 'person', parent: { parent: { _id: 'b' } } };
        expect(summariseContact(doc).lineage).to.deep.equal(['b']);
      });
    });
  });

  describe('summarise', () => {
    it('returns undefined for falsy doc', () => {
      expect(summarise(null)).to.be.undefined;
      expect(summarise(undefined)).to.be.undefined;
    });

    it('returns undefined for a doc without a type', () => {
      expect(summarise({ _id: 'a', _rev: '1' })).to.be.undefined;
    });

    it('returns undefined for non-matching doc types', () => {
      expect(summarise({ _id: 'a', _rev: '1', type: 'form' })).to.be.undefined;
    });

    it('returns undefined for data_record without form', () => {
      expect(summarise({ _id: 'a', _rev: '1', type: 'data_record' })).to.be.undefined;
    });

    it('dispatches to summariseReport for data_record docs', () => {
      const doc = { _id: 'r1', _rev: '1', type: 'data_record', form: 'R', from: '+1' };
      const summary = summarise(doc);
      expect(summary).to.include({ _id: 'r1', form: 'R', from: '+1' });
    });

    it('dispatches to summariseContact for contact docs', () => {
      const doc = { _id: 'c1', _rev: '1', type: 'person', name: 'jeff' };
      const summary = summarise(doc);
      expect(summary).to.include({ _id: 'c1', type: 'person', name: 'jeff' });
    });

    it('dispatches to summariseContact for configurable contact types', () => {
      const doc = { _id: 'c1', _rev: '1', type: 'contact', contact_type: 'patient' };
      expect(summarise(doc)).to.include({ _id: 'c1', type: 'contact', contact_type: 'patient' });
    });

    it('dispatches to summariseContact for hardcoded contact types', () => {
      for (const type of ['person', 'clinic', 'health_center', 'district_hospital']) {
        expect(summarise({ _id: 'c1', _rev: '1', type })).to.include({ _id: 'c1', type });
      }
    });

    it('does not treat a non-data_record with a form as a report', () => {
      const summary = summarise({ _id: 'c1', _rev: '1', type: 'person', form: 'pregnancy' });
      expect(summary).to.include({ _id: 'c1', type: 'person' });
      expect(summary).to.not.have.property('subject');
    });
  });
});
