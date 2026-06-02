import { expect } from 'chai';
import {
  getLineage,
  getSubject,
  isContact,
  isReport,
  summarise,
  summariseContact,
  summariseReport,
} from '../../src/libs/summary';

describe('summary lib', () => {
  describe('getLineage', () => {
    it('returns empty array for falsy contact', () => {
      expect(getLineage(null)).to.deep.equal([]);
      expect(getLineage(undefined)).to.deep.equal([]);
    });

    it('returns lineage of parent ids', () => {
      const contact = {
        _id: 'a',
        parent: {
          _id: 'b',
          parent: { _id: 'c' },
        },
      };
      expect(getLineage(contact)).to.deep.equal(['a', 'b', 'c']);
    });

    it('skips contacts without _id', () => {
      const contact = { parent: { _id: 'b' } };
      expect(getLineage(contact)).to.deep.equal(['b']);
    });
  });

  describe('getSubject', () => {
    it('returns reference type for patient_id', () => {
      expect(getSubject({ patient_id: '12345', fields: {} }))
        .to.deep.equal({ value: '12345', type: 'reference' });
    });

    it('returns reference type for fields.patient_id', () => {
      expect(getSubject({ fields: { patient_id: '12345' } }))
        .to.deep.equal({ value: '12345', type: 'reference' });
    });

    it('returns reference type for fields.patient_uuid', () => {
      expect(getSubject({ fields: { patient_uuid: 'uuid-123' } }))
        .to.deep.equal({ value: 'uuid-123', type: 'reference' });
    });

    it('returns reference type for place_id', () => {
      expect(getSubject({ place_id: 'place-1', fields: {} }))
        .to.deep.equal({ value: 'place-1', type: 'reference' });
    });

    it('returns reference type for fields.place_id', () => {
      expect(getSubject({ fields: { place_id: 'place-1' } }))
        .to.deep.equal({ value: 'place-1', type: 'reference' });
    });

    it('includes patient_name when present with reference', () => {
      expect(getSubject({ fields: { patient_id: '123', patient_name: 'jeff' } }))
        .to.deep.equal({ name: 'jeff', value: '123', type: 'reference' });
    });

    it('returns name type when only patient_name', () => {
      expect(getSubject({ fields: { patient_name: 'jeff' } }))
        .to.deep.equal({ name: 'jeff', value: 'jeff', type: 'name' });
    });

    it('returns unknown type for missing subject errors', () => {
      const doc = { fields: {}, errors: [{ code: 'sys.missing_fields', fields: ['patient_id'] }] };
      expect(getSubject(doc)).to.deep.equal({ type: 'unknown' });
    });

    it('returns empty object when no subject info', () => {
      expect(getSubject({ fields: {} })).to.deep.equal({});
    });

    it('returns empty object for non-missing-subject errors', () => {
      const doc = { fields: {}, errors: [{ code: 'other_error', fields: ['patient_id'] }] };
      expect(getSubject(doc)).to.deep.equal({});
    });
  });

  describe('isContact', () => {
    it('returns false for falsy doc', () => {
      expect(isContact(null)).to.equal(false);
      expect(isContact(undefined)).to.equal(false);
    });

    it('returns false for doc without type', () => {
      expect(isContact({ _id: 'a' } as never)).to.equal(false);
    });

    it('returns true for configurable contact type', () => {
      expect(isContact({ type: 'contact', contact_type: 'patient' } as never)).to.equal(true);
    });

    it('returns true for hardcoded types', () => {
      expect(isContact({ type: 'person' } as never)).to.equal(true);
      expect(isContact({ type: 'clinic' } as never)).to.equal(true);
      expect(isContact({ type: 'health_center' } as never)).to.equal(true);
      expect(isContact({ type: 'district_hospital' } as never)).to.equal(true);
    });

    it('returns false for non-contact types', () => {
      expect(isContact({ type: 'data_record' } as never)).to.equal(false);
      expect(isContact({ type: 'form' } as never)).to.equal(false);
    });
  });

  describe('isReport', () => {
    it('returns false for falsy doc', () => {
      expect(isReport(null)).to.equal(false);
      expect(isReport(undefined)).to.equal(false);
    });

    it('returns true for data_record with form', () => {
      expect(isReport({ type: 'data_record', form: 'pregnancy' } as never)).to.equal(true);
    });

    it('returns false for data_record without form', () => {
      expect(isReport({ type: 'data_record' } as never)).to.equal(false);
    });

    it('returns false for non-data_record docs', () => {
      expect(isReport({ type: 'person', form: 'pregnancy' } as never)).to.equal(false);
    });
  });

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
  });

  describe('summarise', () => {
    it('returns undefined for falsy doc', () => {
      expect(summarise(null)).to.equal(undefined);
      expect(summarise(undefined)).to.equal(undefined);
    });

    it('returns undefined for non-matching doc types', () => {
      expect(summarise({ _id: 'a', _rev: '1', type: 'form' })).to.equal(undefined);
    });

    it('returns undefined for data_record without form', () => {
      expect(summarise({ _id: 'a', _rev: '1', type: 'data_record' })).to.equal(undefined);
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
  });
});
