describe('ContactChangeFilter service', () => {

  let service;
  let contactTypesIncludes;

  beforeEach(() => {
    contactTypesIncludes = sinon.stub().returns(true);
    module('inboxApp');
    module($provide => {
      $provide.value('ContactTypes', { includes: contactTypesIncludes });
    });
    inject($injector => {
      service = $injector.get('ContactChangeFilter');
    });
  });

  it('checks for invalid input', () => {
    chai.assert.equal(service.matchContact(), false);
    chai.assert.equal(service.matchContact({}, { something: true }), false);
    chai.assert.equal(service.matchContact('notAnObject', undefined), false);
    chai.assert.equal(service.matchContact([undefined], 11), false);
    chai.assert.equal(service.isDeleted(undefined), false);
  });

  describe('matchContact', () => {
    it('returns true for same ID', () => {
      const change = { id: '123' };
      const contact = { doc: { _id: '123' } };
      chai.expect(service.matchContact(change, contact)).to.equal(true);
    });

    it('returns false for different ID', () => {
      const change = { id: '456' };
      const contact = { doc: { _id: '123' } };

      chai.expect(service.matchContact(change, contact)).to.equal(false);
    });
  });

  describe('isRelevantContact', () => {
    it('returns false when not a contact type', () => {
      contactTypesIncludes.returns(false);

      const change1 = { doc: { parent: { _id: '123'} } };
      const change2 = { doc: { parent: { _id: '123'}, type: 'data_record' } };
      const change3 = { doc: {} };
      const contact = { doc: { _id: '123' } };

      chai.expect(service.isRelevantContact(change1, contact)).to.equal(false);
      chai.expect(service.isRelevantContact(change2, contact)).to.equal(false);
      chai.expect(service.isRelevantContact(change3, contact)).to.equal(false);
    });

    it('returns true for new children', () => {
      const change1 = { doc: { type: 'person', parent: { _id: '123'} } };
      const change2 = { doc: { type: 'health_center', parent: { _id: '123'} } };
      const change3 = { doc: { type: 'clinic', parent: { _id: '123'} } };
      const change4 = { doc: { type: 'district_hospital', parent: { _id: '123'} } };
      const contact = { doc: { _id: '123' } };

      chai.expect(service.isRelevantContact(change1, contact)).to.equal(true);
      chai.expect(service.isRelevantContact(change2, contact)).to.equal(true);
      chai.expect(service.isRelevantContact(change3, contact)).to.equal(true);
      chai.expect(service.isRelevantContact(change4, contact)).to.equal(true);
    });

    it('returns true for previous children', () => {
      const change1 = { doc: { _id: 'p1', type: 'person' } };
      const change2 = { doc: { _id: 'o1', type: 'district_hospital' } };
      const change3 = { doc: { _id: 'p2', type: 'clinic' } };
      const contact = {
        doc: { },
        children: {
          persons: [
            { doc: { _id: 'p1' } },
            { doc: { _id: 'p2' } }
          ],
          other: [
            { doc: { _id: 'o1' } },
            { doc: { _id: 'o2' } }
          ],
          someProperty: 'someValue'
        }
      };

      chai.expect(service.isRelevantContact(change1, contact)).to.equal(true);
      chai.expect(service.isRelevantContact(change2, contact)).to.equal(true);
      chai.expect(service.isRelevantContact(change3, contact)).to.equal(true);
    });

    it('returns true for ancestor', () => {
      const change1 = { doc: { _id: '123', type: 'clinic'} };
      const change2 = { doc: { _id: '456', type: 'district_hospital'} };
      const change3 = { doc: { _id: '789', type: 'health_center'} };
      const contact = {
        doc: { _id: 'id' },
        lineage: [
          {_id: '123'},
          {_id: '456'},
          {_id: '789'}
        ]
      };

      chai.expect(service.isRelevantContact(change1, contact)).to.equal(true);
      chai.expect(service.isRelevantContact(change2, contact)).to.equal(true);
      chai.expect(service.isRelevantContact(change3, contact)).to.equal(true);
    });

    it('returns false for anything else', () => {
      const change = { doc: { _id: 'oid', parent: { _id: 'opid' } } };

      const contact = {
        doc: {_id: 'id', parent: {_id: 'pid'}},
        children: {
          persons: [
            {doc: {_id: 'p1'}},
            {doc: {_id: 'p2'}}
          ],
          other: [
            {doc: {_id: 'o1'}},
            {doc: {_id: 'o2'}}
          ],
          someProperty: 'someValue'
        },
        lineage: [
          {_id: '123'},
          {_id: '456'},
          {_id: '789'}
        ]
      };

      chai.expect(service.isRelevantContact(change, contact)).to.equal(false);
    });

    it('does not crash when lineage is undefined', () => {
      const change = { doc: { _id: 'oid', parent: { _id: 'opid' } } };

      const contact = {
        doc: {_id: 'id', parent: {_id: 'pid'}},
        children: {
          persons: [
            {doc: {_id: 'p1'}},
            {doc: {_id: 'p2'}}
          ],
          other: [
            {doc: {_id: 'o1'}},
            {doc: {_id: 'o2'}}
          ],
          someProperty: 'someValue'
        },
        lineage: [
          {_id: '123'},
          {_id: '456'},
          {_id: '789'},
          undefined,
          undefined
        ]
      };

      chai.expect(service.isRelevantContact(change, contact)).to.equal(false);
    });
  });

  describe('isRelevantReport', () => {
    let change1;
    let change2;
    let contact;
    beforeEach(() => {
      change1 = {
        doc: {
          form: 'a',
          type: 'data_record',
          fields: {}
        }
      };

      change2 = {
        doc: {
          form: 'a',
          type: 'data_record'
        }
      };

      contact = {
        doc: { _id: 'id', patient_id: 'patient', place_id: 'place' },
        children: {
          persons: [
            { doc: { _id: 'child_id1', patient_id: 'child_patient1', place_id: 'child_place1' }},
            { doc: { _id: 'child_id2', patient_id: 'child_patient2', place_id: 'child_place2' }}
          ],
          clinics: [
            { doc: { _id: 'child_id3', patient_id: 'child_patient3', place_id: 'child_place3' }}
          ]
        },
      };
    });

    it('returns true for direct contact with matching doc ID', () => {
      change1.doc.fields.patient_id = 'id';
      chai.expect(service.isRelevantReport(change1, contact)).to.equal(true);
    });

    it('returns true for direct contact with matching patient_id', () => {
      change1.doc.fields.patient_id = 'patient';
      change2.doc.patient_id = 'patient';

      chai.expect(service.isRelevantReport(change1, contact)).to.equal(true);
      chai.expect(service.isRelevantReport(change2, contact)).to.equal(true);
    });

    it('returns true for direct contact with matching place_id doc ID', () => {
      change1.doc.fields.place_id = 'id';
      change2.doc.place_id = 'id';

      chai.expect(service.isRelevantReport(change1, contact)).to.equal(true);
      chai.expect(service.isRelevantReport(change2, contact)).to.equal(true);
    });

    it('returns true for direct contact with matching place_id', () => {
      change1.doc.fields.place_id = 'place';
      change2.doc.place_id = 'place';

      chai.expect(service.isRelevantReport(change1, contact)).to.equal(true);
      chai.expect(service.isRelevantReport(change2, contact)).to.equal(true);
    });

    it('returns true for child contact with matching doc ID', () => {
      change1.doc.fields.patient_id = 'child_id2';
      chai.expect(service.isRelevantReport(change1, contact)).to.equal(true);
      change1.doc.fields.patient_id = 'child_id3';
      chai.expect(service.isRelevantReport(change1, contact)).to.equal(true);

      change1.doc.patient_id = 'child_id2';
      chai.expect(service.isRelevantReport(change1, contact)).to.equal(true);
      change1.doc.patient_id = 'child_id3';
      chai.expect(service.isRelevantReport(change1, contact)).to.equal(true);
    });

    it('returns true for child contact with matching patient_id', () => {
      change1.doc.fields.patient_id = 'child_patient1';
      chai.expect(service.isRelevantReport(change1, contact)).to.equal(true);
      change1.doc.fields.patient_id = 'child_patient3';
      chai.expect(service.isRelevantReport(change1, contact)).to.equal(true);

      change2.doc.patient_id = 'child_patient1';
      chai.expect(service.isRelevantReport(change2, contact)).to.equal(true);
      change2.doc.patient_id = 'child_patient3';
      chai.expect(service.isRelevantReport(change2, contact)).to.equal(true);
    });

    it('returns true for child contact with matching place_id doc ID', () => {
      change1.doc.fields.place_id = 'child_id2';
      chai.expect(service.isRelevantReport(change1, contact)).to.equal(true);
      change1.doc.fields.place_id = 'child_id3';
      chai.expect(service.isRelevantReport(change1, contact)).to.equal(true);

      change2.doc.place_id = 'child_id2';
      chai.expect(service.isRelevantReport(change2, contact)).to.equal(true);
      change2.doc.place_id = 'child_id3';
      chai.expect(service.isRelevantReport(change2, contact)).to.equal(true);
    });

    it('returns true for child contact with matching place_id', () => {
      change1.doc.fields.place_id = 'child_place2';
      chai.expect(service.isRelevantReport(change1, contact)).to.equal(true);
      change1.doc.fields.place_id = 'child_place3';
      chai.expect(service.isRelevantReport(change1, contact)).to.equal(true);

      change2.doc.place_id = 'child_place2';
      chai.expect(service.isRelevantReport(change2, contact)).to.equal(true);
      change2.doc.place_id = 'child_place3';
      chai.expect(service.isRelevantReport(change2, contact)).to.equal(true);
    });

    it('returns false for direct contact with different doc id', () => {
      change1.doc.fields.patient_id = 'nid';
      chai.expect(service.isRelevantReport(change1, contact)).to.equal(false);

      change2.doc.patient_id = 'nid';
      chai.expect(service.isRelevantReport(change2, contact)).to.equal(false);
    });

    it('returns false for direct contact with different patient_id', () => {
      change1.doc.fields.patient_id = 'npatient';
      chai.expect(service.isRelevantReport(change1, contact)).to.equal(false);

      change2.doc.patient_id = 'npatient';
      chai.expect(service.isRelevantReport(change2, contact)).to.equal(false);
    });

    it('returns false for direct contact with different place_id', () => {
      change1.doc.fields.place_id = 'nplace';
      chai.expect(service.isRelevantReport(change1, contact)).to.equal(false);

      change2.doc.place_id = 'nplace';
      chai.expect(service.isRelevantReport(change2, contact)).to.equal(false);
    });

    it('returns false for child contact with different doc ID', () => {
      change1.doc.fields.patient_id = 'nchild_id2';
      chai.expect(service.isRelevantReport(change1,  contact)).to.equal(false);
      change1.doc.fields.patient_id = 'nchild_id3';
      chai.expect(service.isRelevantReport(change1, contact)).to.equal(false);

      change2.doc.patient_id = 'nchild_id2';
      chai.expect(service.isRelevantReport(change2,  contact)).to.equal(false);
      change2.doc.patient_id = 'nchild_id3';
      chai.expect(service.isRelevantReport(change2, contact)).to.equal(false);
    });

    it('returns false for child contact with different patient_id', () => {
      change1.doc.fields.patient_id = 'nchild_patient1';
      chai.expect(service.isRelevantReport(change1, contact)).to.equal(false);
      change1.doc.fields.patient_id = 'nchild_patient3';
      chai.expect(service.isRelevantReport(change1, contact)).to.equal(false);

      change2.doc.patient_id = 'nchild_patient1';
      chai.expect(service.isRelevantReport(change2, contact)).to.equal(false);
      change2.doc.patient_id = 'nchild_patient3';
      chai.expect(service.isRelevantReport(change2, contact)).to.equal(false);
    });

    it('returns false for child contact with different place_id', () => {
      change1.doc.fields.place_id = 'nchild_place2';
      chai.expect(service.isRelevantReport(change1, contact)).to.equal(false);
      change1.doc.fields.place_id = 'nchild_place3';
      chai.expect(service.isRelevantReport(change1, contact)).to.equal(false);

      change2.doc.place_id = 'nchild_place2';
      chai.expect(service.isRelevantReport(change2, contact)).to.equal(false);
      change2.doc.place_id = 'nchild_place3';
      chai.expect(service.isRelevantReport(change2, contact)).to.equal(false);
    });
  });

  describe('isDeleted', () => {
    it('returns true when deleted', () => {
      const change = { doc: { _id: '123' }, deleted: true };
      chai.expect(service.isDeleted(change)).to.equal(true);
    });

    it('returns false when property is not set or validates to false', () => {
      const change1 = { doc: { _id: '123' }};
      const change2 = { doc: { _id: '123' }, deleted: false };
      chai.expect(service.isDeleted(change1)).to.equal(false);
      chai.expect(service.isDeleted(change2)).to.equal(false);
    });
  });

});
