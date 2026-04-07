const { expect } = require('chai');
const { summarise, isContact, getLineage, getSubject } = require('../src/index');

describe('doc-summaries', () => {

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
          parent: {
            _id: 'c'
          }
        }
      };
      expect(getLineage(contact)).to.deep.equal(['a', 'b', 'c']);
    });

    it('skips contacts without _id', () => {
      const contact = {
        parent: {
          _id: 'b'
        }
      };
      expect(getLineage(contact)).to.deep.equal(['b']);
    });
  });

  describe('getSubject', () => {
    it('returns reference type for patient_id', () => {
      const doc = { patient_id: '12345', fields: {} };
      expect(getSubject(doc)).to.deep.equal({ value: '12345', type: 'reference' });
    });

    it('returns reference type for fields.patient_id', () => {
      const doc = { fields: { patient_id: '12345' } };
      expect(getSubject(doc)).to.deep.equal({ value: '12345', type: 'reference' });
    });

    it('returns reference type for fields.patient_uuid', () => {
      const doc = { fields: { patient_uuid: 'uuid-123' } };
      expect(getSubject(doc)).to.deep.equal({ value: 'uuid-123', type: 'reference' });
    });

    it('returns reference type for place_id', () => {
      const doc = { place_id: 'place-1', fields: {} };
      expect(getSubject(doc)).to.deep.equal({ value: 'place-1', type: 'reference' });
    });

    it('returns reference type for fields.place_id', () => {
      const doc = { fields: { place_id: 'place-1' } };
      expect(getSubject(doc)).to.deep.equal({ value: 'place-1', type: 'reference' });
    });

    it('includes patient_name when present with reference', () => {
      const doc = { fields: { patient_id: '123', patient_name: 'jeff' } };
      expect(getSubject(doc)).to.deep.equal({ name: 'jeff', value: '123', type: 'reference' });
    });

    it('returns name type when only patient_name', () => {
      const doc = { fields: { patient_name: 'jeff' } };
      expect(getSubject(doc)).to.deep.equal({ name: 'jeff', value: 'jeff', type: 'name' });
    });

    it('returns unknown type for missing subject errors', () => {
      const doc = {
        fields: {},
        errors: [{ code: 'sys.missing_fields', fields: ['patient_id'] }]
      };
      expect(getSubject(doc)).to.deep.equal({ type: 'unknown' });
    });

    it('returns empty object when no subject info', () => {
      const doc = { fields: {} };
      expect(getSubject(doc)).to.deep.equal({});
    });

    it('returns empty object for non-missing-subject errors', () => {
      const doc = {
        fields: {},
        errors: [{ code: 'other_error', fields: ['patient_id'] }]
      };
      expect(getSubject(doc)).to.deep.equal({});
    });
  });

  describe('isContact', () => {
    it('returns false for falsy doc', () => {
      expect(isContact(null)).to.equal(false);
      expect(isContact(undefined)).to.equal(false);
    });

    it('returns false for doc without type', () => {
      expect(isContact({ _id: 'a' })).to.equal(false);
    });

    it('returns true for configurable contact type', () => {
      expect(isContact({ type: 'contact', contact_type: 'patient' })).to.equal(true);
    });

    it('returns true for hardcoded types', () => {
      expect(isContact({ type: 'person' })).to.equal(true);
      expect(isContact({ type: 'clinic' })).to.equal(true);
      expect(isContact({ type: 'health_center' })).to.equal(true);
      expect(isContact({ type: 'district_hospital' })).to.equal(true);
    });

    it('returns false for non-contact types', () => {
      expect(isContact({ type: 'data_record' })).to.equal(false);
      expect(isContact({ type: 'form' })).to.equal(false);
    });
  });

  describe('summarise', () => {
    it('returns undefined for falsy doc', () => {
      expect(summarise(null)).to.equal(undefined);
      expect(summarise(undefined)).to.equal(undefined);
    });

    it('returns undefined for non-matching doc types', () => {
      expect(summarise({ type: 'form' })).to.equal(undefined);
    });

    it('returns undefined for data_record without form', () => {
      expect(summarise({ type: 'data_record' })).to.equal(undefined);
    });

    describe('reports', () => {
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
            parent: {
              _id: 'd',
              parent: { _id: 'e' }
            }
          },
          verified: true,
          reported_date: 100,
          fields: {
            patient_name: 'jeff',
            patient_id: 'f'
          }
        };

        expect(summarise(doc)).to.deep.equal({
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
          case_id: undefined
        });
      });

      it('uses sent_by when from is missing', () => {
        const doc = {
          _id: 'r1',
          _rev: '1',
          type: 'data_record',
          form: 'R',
          sent_by: '+321',
          reported_date: 200,
          fields: {}
        };
        expect(summarise(doc).from).to.equal('+321');
      });

      it('handles missing contact', () => {
        const doc = {
          _id: 'r1',
          _rev: '1',
          type: 'data_record',
          form: 'R',
          from: '+123',
          reported_date: 200,
          fields: {}
        };
        const result = summarise(doc);
        expect(result.contact).to.equal(undefined);
        expect(result.phone).to.equal(undefined);
        expect(result.lineage).to.deep.equal([]);
      });

      it('marks invalid when errors present', () => {
        const doc = {
          _id: 'r1',
          _rev: '1',
          type: 'data_record',
          form: 'R',
          errors: [{ code: 'sys.missing_fields', fields: ['patient_id'] }],
          reported_date: 200,
          fields: {}
        };
        expect(summarise(doc).valid).to.equal(false);
      });

      it('includes case_id from doc', () => {
        const doc = {
          _id: 'r1',
          _rev: '1',
          type: 'data_record',
          form: 'R',
          case_id: '12345',
          reported_date: 200,
          fields: {}
        };
        expect(summarise(doc).case_id).to.equal('12345');
      });

      it('includes case_id from fields', () => {
        const doc = {
          _id: 'r1',
          _rev: '1',
          type: 'data_record',
          form: 'R',
          reported_date: 200,
          fields: { case_id: '67890' }
        };
        expect(summarise(doc).case_id).to.equal('67890');
      });
    });

    describe('contacts', () => {
      it('summarises a person contact', () => {
        const doc = {
          _id: 'person-1',
          _rev: '1-abc',
          type: 'person',
          name: 'james',
          phone: '+456',
          contact: { _id: 'c' },
          parent: {
            _id: 'f',
            parent: { _id: 'g' }
          },
          date_of_death: 999,
        };

        expect(summarise(doc)).to.deep.equal({
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
          parent: {
            _id: 'f',
            parent: { _id: 'g' }
          },
          muted: true,
        };

        expect(summarise(doc)).to.deep.equal({
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
        const doc = {
          _id: 'c1',
          _rev: '1',
          type: 'person',
          phone: '0123456789',
        };
        expect(summarise(doc).name).to.equal('0123456789');
      });
    });
  });
});
