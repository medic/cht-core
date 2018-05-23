const chai = require('chai');
const lineageFactory = require('../src/lineage');
const memdownMedic = require('memdown-medic');
const cloneDeep = require('lodash/cloneDeep');

let db;

const circular_areaId = 'circular_area';
const circular_chw = {
  _id: 'circular_chw',
  type: 'person',
  parent: { _id: circular_areaId },
  hydrated: true,
  reported_date: '5'
};
const circular_area = {
  _id: circular_areaId,
  type: 'clinic',
  contact: { _id: circular_chw._id }
};
const circular_report = {
  _id: 'circular_report',
  type: 'data_record',
  contact: {
    _id: circular_chw._id,
    parent: { _id: circular_area._id }
  },
  form: {}
};
const dummyDoc = {
  _id: 'dummyDoc',
  name: 'district'
};
const dummyDoc2 = {
  _id: 'dummyDoc2',
  name: 'clinic',
};
const emptyObjectParent = {
  _id: 'emptyObjectParent',
  contact: { _id: 'idontexist' },
  parent: {
    _id: dummyDoc._id,
    parent: {}
  },
  type: 'clinic'
};
const no_contact = {
  _id: 'no_contact',
  contact: { _id: 'doesnt_exist' }
};
const no_lineageContact = {
  _id: 'no_lineageContact'
};
const one_parent = {
  _id: 'one_parent',
  type: 'clinic',
  parent: { _id: dummyDoc._id }
};
const place_parentContact = {
  _id: 'place_parentContact',
  name: 'place_parentContact_name',
  type: 'person',
  phone: '+123',
  reported_date: '5'
};
const place_grandparentContact = {
  _id: 'place_grandparentContact',
  name: 'place_grandparentContact_name',
  phone: '+456'
};
const place_contact = {
  _id: 'place_contact',
  type: 'place_contact_name',
  phone: '+789'
};
const place_grandparent = {
  _id: 'place_grandparent',
  name: 'place_grandparent_name',
  contact: { _id: place_grandparentContact._id }
};
const place_parent = {
  _id: 'place_parent',
  name: 'place_parent_name',
  contact: { _id: place_parentContact._id },
  parent: {
    _id: place_grandparent._id
  }
};
const place = {
  _id: 'place',
  name: 'place_name',
  type: 'clinic',
  contact: { _id: place_contact._id },
  parent: {
    _id: place_parent._id,
    parent: {
      _id: place_grandparent._id
    }
  }
};
const report_parentContact = {
  _id: 'report_parentContact',
  name: 'report_parentContact_name',
  type: 'person',
  phone: '+123',
  reported_date: '5'
};
const report_grandparentContact = {
  _id: 'report_grandparentContact',
  name: 'report_grandparentContact_name',
  type: 'person',
  phone: '+456',
  reported_date: '5'
};
const report_grandparent = {
  _id: 'report_grandparent',
  contact: { _id: report_grandparentContact._id },
  name: 'report_grandparent_name'
};
const report_parent = {
  _id: 'report_parent',
  name: 'report_parent_name',
  contact: { _id: report_parentContact._id },
  parent: {
    _id: report_grandparent._id
  }
};
const report_contact = {
  _id: 'report_contact',
  type: 'person',
  name: 'report_contact_name',
  parent: {
    _id: report_parent._id,
    parent: {
      _id: report_grandparent._id
    }
  },
  reported_date: '5'
};
const report_patient = {
  _id: 'report_patient',
  patient_id: '12345',
  type: 'person',
  name: 'patient_name',
  parent: {
    _id: report_contact._id,
    parent: {
      _id: report_parent._id,
      parent: {
        _id: report_grandparent._id
      }
    }
  },
  reported_date: '5'
};
const report = {
  _id: 'report',
  type: 'data_record',
  form: 'A',
  contact: {
    _id: report_contact._id,
    parent: {
      _id: report_parent._id,
      parent: {
        _id: report_grandparent._id
      }
    }
  },
  fields: {
    patient_id: '12345'
  }
};
const stub_contacts = {
  _id: 'stub_contacts',
  type: 'data_record',
  contact: {
    _id: 'something',
    parent: {
      _id: dummyDoc._id
    }
  },
  form: {}
};
const stub_parents = {
  _id: 'stub_parents',
  type: 'clinic',
  contact: { _id: 'something' },
  parent: {
    _id: 'something_else',
    parent: { _id: 'dummyDoc' }
  }
};
const sms_doc = {
  _id: 'sms_doc',
  type: 'data_record',
  from: '123',
  form: 'D',
  fields: {},
  sms_message: {
    message_id: '76992',
    message: 'somemessage',
    from: '123',
    type: 'sms_message',
    form: 'D'
  }
};

const fixtures = [
  circular_area,
  circular_chw,
  circular_report,
  dummyDoc,
  dummyDoc2,
  emptyObjectParent,
  no_contact,
  no_lineageContact,
  one_parent,
  place_parent,
  place_parentContact,
  place_grandparent,
  place_grandparentContact,
  place_contact,
  place,
  report_parent,
  report_parentContact,
  report_grandparent,
  report_grandparentContact,
  report_contact,
  report_patient,
  report,
  stub_contacts,
  stub_parents,
  sms_doc
];
const deleteDocs = ids => {
  return db.allDocs({
    keys: ids,
    include_docs: true
  }).then(data => {
    const docs = data.rows.map(row => {
      const doc = row.doc;
      if (doc) {
        doc._deleted = true;
        return doc;
      }
    }).filter(doc => doc);
    return db.bulkDocs(docs);
  });
};

describe('Lineage', function() {
  let lineage;

  before(function() {
    return memdownMedic('../../webapp/src')
      .then(database => {
        db = database;
        lineage = lineageFactory(Promise, db);
        return db.bulkDocs(fixtures);
      });
  });

  after(function() {
    const docIds = fixtures.map(doc => doc._id);
    return deleteDocs(docIds);
  });

  describe('fetchLineageById', function() {
    it('returns correct lineage', function() {
      return lineage.fetchLineageById(one_parent._id).then(result => {
        chai.expect(result).to.have.lengthOf(2);
        chai.expect(result[0]).excluding('_rev').to.deep.equal(one_parent);
        chai.expect(result[1]).excluding('_rev').to.deep.equal(dummyDoc);
      });
    });
  });

  describe('fetchHydratedDoc', function() {
    it('returns errors from query', function() {
      return lineage.fetchHydratedDoc('abc').then(
        () => {
          throw new Error('should have thrown a 404');
        },
        err => {
          chai.expect(err.status).to.equal(404);
        }
      );
    });

    it('returns unmodified doc when there is no lineage and no contact', function() {
      return lineage.fetchHydratedDoc('no_lineageContact').then(actual => {
        chai.expect(actual).excluding('_rev').to.deep.equal(no_lineageContact);
      });
    });

    it('handles doc with unknown parent by leaving just the stub', function() {
      return lineage.fetchHydratedDoc(stub_parents._id).then(actual => {
        chai.expect(actual).excludingEvery('_rev').to.deep.equal({
          _id: stub_parents._id,
          type: stub_parents.type,
          contact: { _id: 'something' },
          parent: {
            _id: 'something_else',
            parent: dummyDoc
          }
        });
      });
    });

    it('handles doc with unknown contact by leaving just the stub', function() {
      return lineage.fetchHydratedDoc(stub_contacts._id).then(actual => {
        chai.expect(actual).excludingEvery('_rev').to.deep.equal({
          _id: stub_contacts._id,
          type: stub_contacts.type,
          contact: {
            _id: 'something',
            parent: dummyDoc
          },
          form: {}
        });
      });
    });

    it('handles missing contacts', function() {
      return lineage.fetchHydratedDoc(no_contact._id).then(actual => {
        chai.expect(actual).excluding('_rev').to.deep.equal(no_contact);
      });
    });

    it('attaches the full lineage for reports', function() {
      return lineage.fetchHydratedDoc(report._id).then(actual => {
        chai.assert.checkDeepProperties(actual, {
          form: 'A',
          patient: {
            name: report_patient.name,
            parent: { name: report_contact.name }
          },
          contact: {
            name: report_contact.name,
            parent: {
              name: report_parent.name,
              contact: { phone: '+123' },
              parent: {
                name: report_grandparent.name,
                contact: { phone: '+456' }
              }
            }
          },
          parent: undefined
        });
      });
    });

    it('attaches the contacts', function() {
      return lineage.fetchHydratedDoc(place._id).then(actual => {
        chai.assert.checkDeepProperties(actual, {
          name: place.name,
          contact: { phone: '+789' },
          parent: {
            name: place_parent.name,
            contact: { phone: '+123' },
            parent: {
              name: place_grandparent.name,
              contact: { phone: '+456' }
            }
          }
        });
      });
    });

    // This is a classic use-case: report from CHW who is the contact for their own area
    it('attaches re-used contacts, minify handles the circular references', function() {
      return lineage.fetchHydratedDoc(circular_report._id).then(actual => {
        // The contact and the contact's parent's contact are the hydrated CHW
        chai.expect(actual.contact.parent.contact.hydrated).to.equal(true);
        chai.expect(actual.contact.hydrated).to.equal(true);

        // And we can minify back to the original without error
        lineage.minify(actual);
        chai.expect(actual).excludingEvery('_rev').to.deep.equal(circular_report);
      });
    });

    it('minifying the result returns the starting document for a report', function() {
      const reportCopy = cloneDeep(report);
      return lineage.fetchHydratedDoc(reportCopy._id).then(actual => {
        lineage.minify(actual);
        chai.expect(actual).excluding('_rev').to.deep.equal(report);
      });
    });

    it('minifying the result returns the starting document for a place', function() {
      const placeCopy = cloneDeep(place);
      return lineage.fetchHydratedDoc(placeCopy._id).then(actual => {
        lineage.minify(actual);
        chai.expect(actual).excluding('_rev').to.deep.equal(place);
      });
    });

    it('works for SMS reports', function() {
      return lineage.fetchHydratedDoc(sms_doc._id).then(actual => {
        chai.expect(actual).excluding('_rev').to.deep.equal(sms_doc);
      });
    });

    it('handles doc with empty-object parent by removing it', function() {
      return lineage.fetchHydratedDoc(emptyObjectParent._id).then(actual => {
        chai.expect(actual).excludingEvery('_rev').to.deep.equal({
          _id: emptyObjectParent._id,
          contact: emptyObjectParent.contact,
          parent: dummyDoc,
          type: emptyObjectParent.type
        });
      });
    });
  });

  describe('hydrateDocs', function() {
    it('binds contacts and parents', function() {
      const docs = [ report, place ];

      return lineage.hydrateDocs(docs)
        .then(([ hydratedReport, hydratedPlace ]) => {
          chai.assert.checkDeepProperties(hydratedReport, {
            contact: {
              name: report_contact.name,
              parent: {
                name: report_parent.name,
                contact: { name: report_parentContact.name },
                parent: {
                  name: report_grandparent.name,
                  contact: { name: report_grandparentContact.name }
                }
              }
            },
            parent: undefined,
            patient: { _id: report_patient._id }
          });
          chai.assert.checkDeepProperties(hydratedPlace, {
            contact: { name: place_contact.name },
            parent: {
              name: place_parent.name,
              contact: { name: place_parentContact.name },
              parent: {
                name: place_grandparent.name,
                contact: { name: place_grandparentContact.name }
              }
            }
          });
        });
    });

    it('ignores db-fetch errors', function() {
      const docs = [ report, place ];

      return deleteDocs([place_parent._id, report_parentContact._id])
        .then(() => lineage.hydrateDocs(docs))
        .then(([ hydratedReport, hydratedPlace ]) => {
          chai.assert.checkDeepProperties(hydratedReport, {
            contact: {
              name: report_contact.name,
              parent: {
                name: report_parent.name,
                contact: {
                  _id: report_parentContact._id,
                  name: undefined
                },
                parent: {
                  name: report_grandparent.name,
                  contact: { name: report_grandparentContact.name }
                }
              }
            },
            parent: undefined
          });
          chai.assert.checkDeepProperties(hydratedPlace, {
            contact: { name: place_contact.name },
            parent: {
              _id: place_parent._id,
              name: undefined,
              parent: {
                name: place_grandparent.name,
                contact: { name: place_grandparentContact.name }
              }
            }
          });
        });
    });

    it('minifying the result returns the starting documents', function() {
      const docs = [ cloneDeep(report), cloneDeep(place) ];

      return lineage.hydrateDocs(docs)
        .then(([ hydratedReport, hydratedPlace ]) => {
          lineage.minify(hydratedReport);
          lineage.minify(hydratedPlace);
          chai.expect(hydratedReport).excluding('_rev').to.deep.equal(report);
          chai.expect(hydratedPlace).excluding('_rev').to.deep.equal(place);
        });
    });
  });
});
