const { assert, expect } = require('chai');
const lineageFactory = require('../src');
const memdownMedic = require('@medic/memdown');
const cloneDeep = require('lodash/cloneDeep');

let db;

const child_is_great_grandparent = {
  _id: 'child_is_great_grandparent',
  type: 'person',
  parent: { _id: 'cigg_parent' },
  reported_date: 5
};
const cigg_parent = {
  _id: 'cigg_parent',
  type: 'person',
  parent: { _id: 'cigg_grandparent' },
  reported_date: 5
};
const cigg_grandparent = {
  _id: 'cigg_grandparent',
  type: 'person',
  parent: { _id: 'child_is_great_grandparent' },
  reported_date: 5
};
const child_is_parent = {
  _id: 'child_is_parent',
  type: 'person',
  parent: { _id: 'child_is_parent' },
  reported_date: 5
};
const child_is_grandparent = {
  _id: 'child_is_grandparent',
  type: 'person',
  parent: {
    _id: 'something_else',
    parent: { _id: 'child_is_grandparent' }
  },
  reported_date: 5
};
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
const person_with_circular_ids = {
  _id: 'circular_person',
  type: 'person',
  parent: { _id: 'circular_person' },
  reported_date: '5',
};
const place_with_circular_ids = {
  _id: 'circular_place',
  type: 'clinic',
  contact: { _id: 'circular_place' },
  parent: { _id: 'circular_person' },
  reported_date: '5',
};
const report_with_circular_ids = {
  _id: 'report_with_circular_ids',
  type: 'data_record',
  contact: { _id: 'circular_place' },
  parent: { _id: 'circular_person' },
  patient_id: 'circular_person',
  reported_date: '5',
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
    _id: report_parent._id,
    parent: {
      _id: report_grandparent._id
    }
  },
  reported_date: '5'
};
const report_place = {
  _id: 'report_place',
  place_id: '54321',
  type: 'clinic',
  name: 'place_name',
  parent: {
    _id: report_parent._id,
    parent: {
      _id: report_grandparent._id
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
const report_with_place = {
  _id: 'report_with_place',
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
    place_id: '54321'
  }
};

const report_with_place_uuid = {
  _id: 'report_with_place_uuid',
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
    place_id: report_place._id,
  }
};

const report_with_place_and_patient = {
  _id: 'report_with_place_and_patient',
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
    place_id: '54321',
    patient_id: '12345',
  }
};
const report2 = {
  _id: 'report2',
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
    patient_id: '',
    patient_uuid: report_patient._id
  }
};
const report3 = {
  _id: 'report3',
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
    patient_id: report_patient._id
  }
};
const report4 = {
  _id: 'report4',
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
    patient_id: 'something'
  }
};
const report5 = {
  _id: 'report5',
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
    place_id: 'something'
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
const placeWithLinks = {
  _id: 'placeWithLinks',
  name: 'place_name',
  type: 'clinic',
  contact: { _id: place_contact._id },
  parent: {
    _id: place_parent._id,
    parent: {
      _id: place_grandparent._id
    }
  },
  linked_docs: {
    contact_tag_1: report_parent._id,
    contact_tag_2: { _id: report_contact._id },
    contact_tag_3: { _id: '404' },
    report_tag_1: sms_doc._id,
  },
};
const personWithLinks = {
  _id: 'personWithLinks',
  name: 'person_name',
  type: 'person',
  parent: {
    _id: placeWithLinks._id,
    parent: {
      _id: place_parent._id,
      parent: {
        _id: place_grandparent._id
      }
    },
  },
  linked_docs: {
    one_tag: { _id: person_with_circular_ids._id },
    other_tag: report_grandparent._id,
    no_tag: 'not_found',
  },
};
const reportWithLinks = {
  _id: 'reportWithLinks',
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
    patient_id: 'something'
  },
  linked_docs: {
    a: { _id: report_grandparent._id },
    b: report_parent._id,
    c: { this: 'is an object', that: 'will remain unchanged' },
  },
};
const contactWithStringLinks = {
  _id: 'contactWithStringLinks',
  name: 'place_name',
  type: 'clinic',
  contact: { _id: place_contact._id },
  parent: {
    _id: place_parent._id,
    parent: {
      _id: place_grandparent._id
    }
  },
  linked_docs: 'this is a string',
};
const contactWithArrayLinks = {
  _id: 'contactWithArrayLinks',
  name: 'place_name',
  type: 'clinic',
  contact: { _id: place_contact._id },
  parent: {
    _id: place_parent._id,
    parent: {
      _id: place_grandparent._id
    }
  },
  linked_docs: [{ _id: place_grandparent._id }, 'this is a string', 78979],
};

const fixtures = [
  child_is_great_grandparent,
  cigg_parent,
  cigg_grandparent,
  child_is_parent,
  child_is_grandparent,
  circular_area,
  person_with_circular_ids,
  place_with_circular_ids,
  report_with_circular_ids,
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
  report_place,
  report,
  report_with_place,
  report_with_place_uuid,
  report_with_place_and_patient,
  report2,
  report3,
  report4,
  report5,
  stub_contacts,
  stub_parents,
  sms_doc,
  placeWithLinks,
  personWithLinks,
  reportWithLinks,
  contactWithStringLinks,
  contactWithArrayLinks,
];
const deleteDocs = ids => {
  return db
    .allDocs({
      keys: ids,
      include_docs: true
    })
    .then(data => {
      const docs = data.rows
        .filter(row => row.doc)
        .map(row => {
          row.doc._deleted = true;
          return row.doc;
        });
      return db.bulkDocs(docs);
    });
};

describe('Lineage', function() {
  let lineage;

  before(function() {
    return memdownMedic('../..')
      .then(database => {
        db = database;
        lineage = lineageFactory(Promise, db);
      });
  });

  beforeEach(() => {
    // some tests delete docs, so make sure all exist!
    return db.bulkDocs(fixtures);
  });

  after(function() {
    const docIds = fixtures.map(doc => doc._id);
    return deleteDocs(docIds);
  });

  describe('fetchLineageById', function() {
    it('returns correct lineage', function() {
      return lineage.fetchLineageById(one_parent._id).then(result => {
        expect(result).to.have.lengthOf(2);
        expect(result[0]).excluding('_rev').to.deep.equal(one_parent);
        expect(result[1]).excluding('_rev').to.deep.equal(dummyDoc);
      });
    });
  });

  describe('fetchLineageByIds', function() {
    it('returns correct lineages', function() {
      return lineage.fetchLineageByIds([one_parent._id]).then(result => {
        expect(result).to.have.lengthOf(1);
        expect(result[0]).to.have.lengthOf(2);
        //We get all parent info for each doc (_rev, name, etc)
        expect(result[0][0].name).to.equal(one_parent.name);
        expect(result[0][1].name).to.equal(dummyDoc.name);
      });
    });
  });

  describe('fetchContacts', function() {
    it('clones any reused contacts', function() {
      const lineageDocs = [ circular_chw, circular_area ];
      return lineage.fetchContacts(lineageDocs).then(result => {
        expect(result[0]._id).to.equal(circular_chw._id);
        expect(result[0]).to.not.equal(circular_chw);
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
          expect(err.status).to.equal(404);
        }
      );
    });

    it('returns unmodified doc when there is no lineage and no contact', function() {
      return lineage.fetchHydratedDoc('no_lineageContact').then(actual => {
        expect(actual).excluding('_rev').to.deep.equal(no_lineageContact);
      });
    });

    it('handles doc with unknown parent by leaving just the stub', function() {
      return lineage.fetchHydratedDoc(stub_parents._id).then(actual => {
        expect(actual).excludingEvery('_rev').to.deep.equal({
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
        expect(actual).excludingEvery('_rev').to.deep.equal({
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
        expect(actual).excluding('_rev').to.deep.equal(no_contact);
      });
    });

    it('attaches the full lineage for reports with patient_id', () => {
      return lineage.fetchHydratedDoc(report._id).then(actual => {
        expect(actual.place).to.equal(undefined);
        assert.checkDeepProperties(actual, {
          form: 'A',
          patient: {
            name: report_patient.name,
            parent: {
              name: report_parent.name,
              contact: {
                name: report_parentContact.name,
                phone: report_parentContact.phone,
              }
            }
          },
          contact: {
            name: report_contact.name,
            parent: {
              name: report_parent.name,
              contact: {
                phone: '+123',
                name: report_parentContact.name,
              },
              parent: {
                name: report_grandparent.name,
                contact: {
                  phone: '+456',
                  name: report_grandparentContact.name,
                }
              }
            }
          },
          parent: undefined
        });
      });
    });

    it('attaches patient lineage when using patient_uuid field', () => {
      return lineage.fetchHydratedDoc(report2._id).then(actual => {
        expect(actual.place).to.equal(undefined);
        assert.checkDeepProperties(actual, {
          form: 'A',
          patient: {
            name: report_patient.name,
            parent: {
              name: report_parent.name,
              contact: {
                name: report_parentContact.name
              }
            }
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

    it('attaches patient lineage when using patient_id field that contains a uuid', () => {
      return lineage.fetchHydratedDoc(report3._id).then(actual => {
        expect(actual.place).to.equal(undefined);
        assert.checkDeepProperties(actual, {
          form: 'A',
          patient: {
            name: report_patient.name,
            parent: {
              name: report_parent.name,
              contact: {
                name: report_parentContact.name,
              }
            }
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

    it('attaches the full lineage for reports with place_id', () => {
      return lineage.fetchHydratedDoc(report_with_place._id).then(actual => {
        expect(actual.patient).to.equal(undefined);
        assert.checkDeepProperties(actual, {
          form: 'A',
          place: {
            name: report_place.name,
            parent: {
              name: report_parent.name,
              contact: {
                name: report_parentContact.name,
                phone: report_parentContact.phone,
              }
            }
          },
          contact: {
            name: report_contact.name,
            parent: {
              name: report_parent.name,
              contact: {
                phone: '+123',
                name: report_parentContact.name,
              },
              parent: {
                name: report_grandparent.name,
                contact: {
                  phone: '+456',
                  name: report_grandparentContact.name,
                }
              }
            }
          },
          parent: undefined
        });
      });
    });

    it('attaches the full lineage for reports with place_id containing a uuid', () => {
      return lineage.fetchHydratedDoc(report_with_place_uuid._id).then(actual => {
        expect(actual.patient).to.equal(undefined);
        assert.checkDeepProperties(actual, {
          form: 'A',
          place: {
            name: report_place.name,
            parent: {
              name: report_parent.name,
              contact: {
                name: report_parentContact.name,
                phone: report_parentContact.phone,
              }
            }
          },
          contact: {
            name: report_contact.name,
            parent: {
              name: report_parent.name,
              contact: {
                phone: '+123',
                name: report_parentContact.name,
              },
              parent: {
                name: report_grandparent.name,
                contact: {
                  phone: '+456',
                  name: report_grandparentContact.name,
                }
              }
            }
          },
          parent: undefined
        });
      });
    });

    it('attaches the full lineage for reports with place_id and patient_id', () => {
      return lineage.fetchHydratedDoc(report_with_place_and_patient._id).then(actual => {
        assert.checkDeepProperties(actual, {
          form: 'A',
          place: {
            name: report_place.name,
            parent: {
              name: report_parent.name,
              contact: {
                name: report_parentContact.name,
                phone: report_parentContact.phone,
              }
            }
          },
          patient: {
            name: report_patient.name,
            parent: {
              name: report_parent.name,
              contact: {
                name: report_parentContact.name,
              }
            }
          },
          contact: {
            name: report_contact.name,
            parent: {
              name: report_parent.name,
              contact: {
                phone: '+123',
                name: report_parentContact.name,
              },
              parent: {
                name: report_grandparent.name,
                contact: {
                  phone: '+456',
                  name: report_grandparentContact.name,
                }
              }
            }
          },
          parent: undefined
        });
      });
    });

    it('should work when patient is not found', () => {
      return lineage.fetchHydratedDoc(report4._id).then(actual => {
        expect(actual.patient).to.equal(undefined);
        expect(actual.place).to.equal(undefined);
        assert.checkDeepProperties(actual, {
          form: 'A',
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

    it('should work when place is not found', () => {
      return lineage.fetchHydratedDoc(report5._id).then(actual => {
        expect(actual.place).to.equal(undefined);
        expect(actual.patient).to.equal(undefined);
        assert.checkDeepProperties(actual, {
          form: 'A',
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
        assert.checkDeepProperties(actual, {
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
        expect(actual.contact.parent.contact.hydrated).to.equal(true);
        expect(actual.contact.hydrated).to.equal(true);

        // And we can minify back to the original without error
        lineage.minify(actual);
        expect(actual).excludingEvery('_rev').to.deep.equal(circular_report);
      });
    });

    it('minifying the result returns the starting document for a report', function() {
      const reportCopy = cloneDeep(report);
      return lineage.fetchHydratedDoc(reportCopy._id).then(actual => {
        lineage.minify(actual);
        expect(actual).excluding('_rev').to.deep.equal(report);
      });
    });

    it('minifying the result returns the starting document for a place', function() {
      const placeCopy = cloneDeep(place);
      return lineage.fetchHydratedDoc(placeCopy._id).then(actual => {
        lineage.minify(actual);
        expect(actual).excluding('_rev').to.deep.equal(place);
      });
    });

    it('works for SMS reports', function() {
      return lineage.fetchHydratedDoc(sms_doc._id).then(actual => {
        expect(actual).excluding('_rev').to.deep.equal(sms_doc);
      });
    });

    it('handles doc with empty-object parent by removing it', function() {
      return lineage.fetchHydratedDoc(emptyObjectParent._id).then(actual => {
        expect(actual).excludingEvery('_rev').to.deep.equal({
          _id: emptyObjectParent._id,
          contact: emptyObjectParent.contact,
          parent: dummyDoc,
          type: emptyObjectParent.type
        });
      });
    });

    it('should hydrate linked docs from contacts', () => {
      return lineage.fetchHydratedDoc(placeWithLinks._id).then(actual => {
        expect(actual).excludingEvery('_rev').to.deep.equal({
          _id: placeWithLinks._id,
          type: placeWithLinks.type,
          contact: place_contact,
          name: placeWithLinks.name,
          parent: {
            _id: place_parent._id,
            name: place_parent.name,
            contact: place_parentContact,
            parent: {
              name: place_grandparent.name,
              _id: place_grandparent._id,
              contact: place_grandparentContact,
            }
          },
          linked_docs: {
            contact_tag_1: report_parent,
            contact_tag_2: report_contact,
            contact_tag_3: { _id: '404' },
            report_tag_1: sms_doc,
          },
        });
      });
    });

    it('should not hydrate linked docs from reports ', () => {
      return lineage.fetchHydratedDoc(reportWithLinks._id).then(actual => {
        expect(actual.linked_docs).to.deep.equal(reportWithLinks.linked_docs);
      });
    });
  });

  describe('hydrateDocs', function() {
    it('binds contacts and parents', function() {
      const docs = [ report, place, report_with_place, report_with_place_and_patient ];

      return lineage.hydrateDocs(docs)
        .then(([ hydratedReport, hydratedPlace, hydratedReportWithPlace, hydratedReportWithPlaceAndPatient ]) => {
          assert.checkDeepProperties(hydratedReport, {
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
            place: undefined,
            patient: {
              _id: report_patient._id,
              name: report_patient.name,
              parent: {
                _id: report_parent._id,
                name: report_parent.name,
                contact: {
                  _id: report_parentContact._id,
                  name: report_parentContact.name,
                }
              }
            },
          });
          assert.checkDeepProperties(hydratedPlace, {
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
          assert.checkDeepProperties(hydratedReportWithPlace, {
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
            patient: undefined,
            place: {
              _id: report_place._id,
              name: report_place.name,
              parent: {
                _id: report_parent._id,
                name: report_parent.name,
                contact: {
                  _id: report_parentContact._id,
                  name: report_parentContact.name,
                }
              }
            },
          });
          assert.checkDeepProperties(hydratedReportWithPlaceAndPatient, {
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
            patient: {
              _id: report_patient._id,
              name: report_patient.name,
              parent: {
                _id: report_parent._id,
                name: report_parent.name,
                contact: {
                  _id: report_parentContact._id,
                  name: report_parentContact.name,
                }
              }
            },
            place: {
              _id: report_place._id,
              name: report_place.name,
              parent: {
                _id: report_parent._id,
                name: report_parent.name,
                contact: {
                  _id: report_parentContact._id,
                  name: report_parentContact.name,
                }
              }
            },
          });
        });
    });

    it('ignores db-fetch errors', function() {
      const docs = [ report, place, report_with_place ];

      return deleteDocs([place_parent._id, report_parentContact._id])
        .then(() => lineage.hydrateDocs(docs))
        .then(([ hydratedReport, hydratedPlace, hydratedReportWithPlace ]) => {
          assert.checkDeepProperties(hydratedReport, {
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
          assert.checkDeepProperties(hydratedPlace, {
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
          assert.checkDeepProperties(hydratedReportWithPlace, {
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
        });
    });

    it('minifying the result returns the starting documents', function() {
      const docs = [ cloneDeep(report), cloneDeep(place), cloneDeep(report_with_place) ];

      return lineage.hydrateDocs(docs)
        .then(([ hydratedReport, hydratedPlace, hydratedReportWithPlace ]) => {
          lineage.minify(hydratedReport);
          lineage.minify(hydratedPlace);
          lineage.minify(hydratedReportWithPlace);
          expect(hydratedReport).excluding('_rev').to.deep.equal(report);
          expect(hydratedPlace).excluding('_rev').to.deep.equal(place);
          expect(hydratedReportWithPlace).excluding('_rev').to.deep.equal(report_with_place);
        });
    });

    it('does not return a report with circular references', function () {
      return lineage.hydrateDocs([circular_report])
        .then(([ actual ]) => {
          // The contact and the contact's parent's contact are the hydrated CHW
          expect(actual.contact.parent.contact.hydrated).to.equal(true);
          expect(actual.contact.hydrated).to.equal(true);

          // And we can minify back to the original without error
          lineage.minify(actual);
          expect(actual).excludingEvery('_rev').to.deep.equal(circular_report);
        });
    });

    it('handles person with circular reference ids', () => {
      return lineage.hydrateDocs([person_with_circular_ids])
        .then(([ actual ]) => {
          expect(actual._id).to.eq(person_with_circular_ids._id);
          expect(actual.parent._id).to.eq(person_with_circular_ids._id);
          expect(actual.parent.parent._id).to.eq(person_with_circular_ids._id);
          expect(actual.parent.parent.parent).to.be.undefined;
        });
    });

    it('handles place with circular reference ids', () => {
      return lineage.hydrateDocs([place_with_circular_ids])
        .then(([ actual ]) => {
          assert.checkDeepProperties(actual, {
            _id: place_with_circular_ids._id,
            type: 'clinic',

            contact: {
              _id: place_with_circular_ids._id,
              parent: {
                _id: person_with_circular_ids._id
              },
              contact: {
                _id: place_with_circular_ids._id,
                contact: undefined,
              },
            },

            parent: {
              _id: person_with_circular_ids._id,
              parent: {
                _id: person_with_circular_ids._id,
                parent: undefined,
              }
            },
          });
        });
    });

    it('handles report with circular reference ids', () => {
      return lineage.hydrateDocs([report_with_circular_ids])
        .then(([ actual ]) => {
          assert.checkDeepProperties(actual, {
            _id: report_with_circular_ids._id,
            patient: {
              _id: person_with_circular_ids._id,
              type: 'person',
              parent: {
                _id: person_with_circular_ids._id,
                type: 'person',
                parent: {
                  _id: person_with_circular_ids._id,
                  parent: undefined,
                }
              }
            },
          });
        });
    });

    it('should not recurse more than needed', () => {
      const copy = (doc) => cloneDeep(doc);
      return Promise
        .all([
          lineage.hydrateDocs([circular_report]),
          lineage.hydrateDocs([copy(circular_report), copy(circular_report)])
        ])
        .then(results => {
          expect(results[0][0]).to.deep.equal(results[1][0]);
          expect(results[0][0]).to.deep.equal(results[1][1]);
        });
    });

    it('processing a doc with itself as a parent does not error out', function() {
      const docs = [ cloneDeep(child_is_parent) ];

      return lineage.hydrateDocs(docs).then(result => {
        assert.checkDeepProperties(result[0], {
          _id: 'child_is_parent',
          parent: {
            _id: 'child_is_parent',
            parent: { _id: 'child_is_parent' },
          },
        });
      });
    });

    it('processing a doc with itself as a grandparent does not error out', function() {
      const docs = [ cloneDeep(child_is_grandparent) ];

      return lineage.hydrateDocs(docs).then(result => {
        assert.checkDeepProperties(result[0], {
          _id: 'child_is_grandparent',
          parent: {
            _id: 'something_else',
            parent: {
              _id: 'child_is_grandparent',
              parent: {
                _id: 'something_else'
              },
            },
          },
        });
      });
    });

    it('processing a doc with itself as a grandparent referenced through intermediate docs does not error out', () => {
      const docs = [ cloneDeep(child_is_great_grandparent), cloneDeep(cigg_parent), cloneDeep(cigg_grandparent) ];

      return lineage.hydrateDocs(docs).then(result => {
        expect(result.length).to.equal(3);
        assert.checkDeepProperties(result[0], {
          _id: 'child_is_great_grandparent',
          parent: {
            _id: 'cigg_parent',
            parent: {
              _id: 'cigg_grandparent',
            },
          },
        });
        assert.checkDeepProperties(result[1], {
          _id: 'cigg_parent',
          parent: {
            _id: 'cigg_grandparent',
            parent: {
              _id: 'child_is_great_grandparent',
            },
          },
        });
        assert.checkDeepProperties(result[2], {
          _id: 'cigg_grandparent',
          parent: {
            _id: 'child_is_great_grandparent',
            parent: {
              _id: 'cigg_parent',
              parent: {
                _id: 'cigg_grandparent'
              },
            },
          },
        });
      });
    });

    it('should hydrate linked docs from contacts, but not from reports', () => {
      const docs = [
        cloneDeep(placeWithLinks),
        cloneDeep(personWithLinks),
        cloneDeep(reportWithLinks),
        cloneDeep(contactWithArrayLinks),
        cloneDeep(contactWithStringLinks),
      ];

      return lineage.hydrateDocs(docs).then(actual => {
        expect(actual).excludingEvery('_rev').to.deep.equal([
          {
            _id: placeWithLinks._id,
            type: placeWithLinks.type,
            contact: place_contact,
            name: placeWithLinks.name,
            parent: {
              _id: place_parent._id,
              name: place_parent.name,
              contact: place_parentContact,
              parent: {
                name: place_grandparent.name,
                _id: place_grandparent._id,
                contact: place_grandparentContact,
              }
            },
            linked_docs: {
              contact_tag_1: report_parent,
              contact_tag_2: report_contact,
              contact_tag_3: { _id: '404' },
              report_tag_1: sms_doc,
            },
          },
          {
            _id: personWithLinks._id,
            name: personWithLinks.name,
            type: personWithLinks.type,
            parent: {
              _id: placeWithLinks._id,
              type: placeWithLinks.type,
              contact: place_contact,
              name: placeWithLinks.name,
              parent: {
                _id: place_parent._id,
                name: place_parent.name,
                contact: place_parentContact,
                parent: {
                  name: place_grandparent.name,
                  _id: place_grandparent._id,
                  contact: place_grandparentContact,
                }
              },
              linked_docs: {
                contact_tag_1: report_parent,
                contact_tag_2: report_contact,
                contact_tag_3: { _id: '404' },
                report_tag_1: sms_doc,
              },
            },
            linked_docs: {
              one_tag: person_with_circular_ids,
              other_tag: report_grandparent,
              no_tag: 'not_found',
            },
          },
          {
            _id: reportWithLinks._id,
            form: reportWithLinks.form,
            type: reportWithLinks.type,
            fields: reportWithLinks.fields,
            linked_docs: reportWithLinks.linked_docs, // unchanged for reports!
            contact: {
              _id: report_contact._id,
              name: report_contact.name,
              type: report_contact.type,
              reported_date: report_contact.reported_date,
              parent: {
                _id: report_parent._id,
                name: report_parent.name,
                contact: {
                  _id: report_parentContact._id,
                  type: report_parentContact.type,
                  reported_date: report_parentContact.reported_date,
                  phone: '+123',
                  name: report_parentContact.name,
                },
                parent: {
                  _id: report_grandparent._id,
                  name: report_grandparent.name,
                  contact: {
                    _id: report_grandparentContact._id,
                    type: report_grandparentContact.type,
                    reported_date: report_grandparentContact.reported_date,
                    phone: '+456',
                    name: report_grandparentContact.name,
                  }
                }
              }
            },
          },
          {
            _id: contactWithArrayLinks._id,
            type: contactWithArrayLinks.type,
            contact: place_contact,
            name: contactWithArrayLinks.name,
            parent: {
              _id: place_parent._id,
              name: place_parent.name,
              contact: place_parentContact,
              parent: {
                name: place_grandparent.name,
                _id: place_grandparent._id,
                contact: place_grandparentContact,
              }
            },
            linked_docs: contactWithArrayLinks.linked_docs, // unchanged when it's an array
          },
          {
            _id: contactWithStringLinks._id,
            type: contactWithStringLinks.type,
            contact: place_contact,
            name: contactWithStringLinks.name,
            parent: {
              _id: place_parent._id,
              name: place_parent.name,
              contact: place_parentContact,
              parent: {
                name: place_grandparent.name,
                _id: place_grandparent._id,
                contact: place_grandparentContact,
              }
            },
            linked_docs: contactWithStringLinks.linked_docs, // unchanged when it's a string
          },
        ]);
      });
    });

    it('should re-use docs from provided list', () => {
      const docs = [
        {
          _id: 'new_report',
          type: 'data_record',
          contact: { _id: place_contact._id },
          fields: { patient_uuid: 'new_patient' },
        },
        {
          _id: 'new_patient',
          name: 'new patient',
          parent: {
            _id: 'new_place',
            parent: {
              _id: place_parent._id,
              parent: {
                _id: place_grandparent._id
              }
            },
          },
        },
        {
          _id: 'new_place',
          name: 'new place',
          parent: {
            _id: place_parent._id,
            parent: {
              _id: place_grandparent._id
            }
          },
        },
      ];

      return lineage.hydrateDocs(docs).then(actual => {
        expect(actual).excludingEvery(['_rev', 'reported_date']).to.deep.equal([
          {
            _id: 'new_report',
            type: 'data_record',
            contact: {
              _id: place_contact._id,
              phone: place_contact.phone,
              type: place_contact.type,
            },
            fields: { patient_uuid: 'new_patient' },
            patient: {
              _id: 'new_patient',
              name: 'new patient',
              parent: {
                _id: 'new_place',
                name: 'new place',
                parent: {
                  _id: place_parent._id,
                  name: place_parent.name,
                  contact: {
                    _id: place_parentContact._id,
                    name: place_parentContact.name,
                    phone: place_parentContact.phone,
                    type: place_parentContact.type
                  },
                  parent: {
                    _id: place_grandparent._id,
                    name: place_grandparent.name,
                    contact: {
                      _id: place_grandparentContact._id,
                      name: place_grandparentContact.name,
                      phone: place_grandparentContact.phone,
                    }
                  }
                }
              }
            }
          },
          {
            _id: 'new_patient',
            name: 'new patient',
            parent: {
              _id: 'new_place',
              name: 'new place',
              parent: {
                _id: place_parent._id,
                name: place_parent.name,
                contact: {
                  _id: place_parentContact._id,
                  name: place_parentContact.name,
                  phone: place_parentContact.phone,
                  type: place_parentContact.type
                },
                parent: {
                  _id: place_grandparent._id,
                  name: place_grandparent.name,
                  contact: {
                    _id: place_grandparentContact._id,
                    name: place_grandparentContact.name,
                    phone: place_grandparentContact.phone,
                  }
                }
              }
            }
          },
          {
            _id: 'new_place',
            name: 'new place',
            parent: {
              _id: place_parent._id,
              name: place_parent.name,
              contact: {
                _id: place_parentContact._id,
                name: place_parentContact.name,
                phone: place_parentContact.phone,
                type: place_parentContact.type
              },
              parent: {
                _id: place_grandparent._id,
                name: place_grandparent.name,
                contact: {
                  _id: place_grandparentContact._id,
                  name: place_grandparentContact.name,
                  phone: place_grandparentContact.phone,
                }
              }
            }
          }
        ]);
      });
    });
  });

  describe('fetchHydratedDocs', () => {
    it('should crash with bad param', () => {
      return lineage
        .fetchHydratedDocs('false')
        .then(() => assert.fail('Should have thrown'))
        .catch(err => {
          expect(err.message).to.equal('Invalid parameter: "docIds" must be an array');
        });
    });

    it('should work with one contact', () => {
      return lineage.fetchHydratedDocs([report_patient._id]).then(result => {
        expect(result.length).to.equal(1);
        assert.checkDeepProperties(result[0], {
          _id: 'report_patient',
          patient_id: '12345',
          name: 'patient_name',
          parent: {
            _id: report_parent._id,
            name: report_parent.name,
            contact: {
              name: report_parentContact.name,
            },
            parent: {
              _id: report_grandparent._id,
              name: report_grandparent.name,
              contact: {
                name: report_grandparentContact.name,
              },
            }
          },
        });
      });
    });

    it('should work with one report', () => {
      return lineage.fetchHydratedDocs([report._id]).then(result => {
        expect(result.length).to.equal(1);
        assert.checkDeepProperties(result[0], {
          _id: 'report',
          contact: {
            name: report_contact.name,
            parent: {
              name: report_parent.name,
              contact: {
                name: report_parentContact.name,
              },
              parent: {
                name: report_grandparent.name,
                contact: {
                  name: report_grandparentContact.name,
                }
              }
            }
          },
          patient: {
            name: report_patient.name,
            parent: {
              name: report_parent.name,
              contact: {
                name: report_parentContact.name,
              },
              parent: {
                name: report_grandparent.name,
                contact: {
                  name: report_grandparentContact.name
                }
              }
            }
          }
        });
      });
    });

    it('should work with one non-existent doc', () => {
      return lineage.fetchHydratedDocs(['non-existent']).then(result => {
        expect(result).to.deep.equal([]);
      });
    });

    it('should work with multiple docs', () => {
      const docIds = [report_patient._id, 'not_found', place._id, report._id, report_with_place._id];
      return lineage.fetchHydratedDocs(docIds).then(result => {
        expect(result.length).to.equal(4);
        assert.checkDeepProperties(result[0], {
          _id: 'report_patient',
          patient_id: '12345',
          name: 'patient_name',
          parent: {
            _id: report_parent._id,
            name: report_parent.name,
            contact: {
              name: report_parentContact.name,
            },
            parent: {
              _id: report_grandparent._id,
              name: report_grandparent.name,
              contact: {
                name: report_grandparentContact.name,
              },
            }
          },
        });

        assert.checkDeepProperties(result[1], {
          _id: 'place',
          name: 'place_name',
          contact: {
            _id: place_contact._id,
            name: place_contact.name,
          },
          parent: {
            _id: place_parent._id,
            name: place_parent.name,
            parent: {
              _id: place_grandparent._id,
              name: place_grandparent.name,
            }
          }
        });

        assert.checkDeepProperties(result[2], {
          _id: 'report',
          contact: {
            name: report_contact.name,
            parent: {
              name: report_parent.name,
              contact: {
                name: report_parentContact.name,
              },
              parent: {
                name: report_grandparent.name,
                contact: {
                  name: report_grandparentContact.name,
                }
              }
            }
          },
          patient: {
            name: report_patient.name,
            parent: {
              name: report_parent.name,
              contact: {
                name: report_parentContact.name,
              },
              parent: {
                name: report_grandparent.name,
                contact: {
                  name: report_grandparentContact.name
                }
              }
            }
          }
        });

        assert.checkDeepProperties(result[3], {
          _id: 'report_with_place',
          contact: {
            name: report_contact.name,
            parent: {
              name: report_parent.name,
              contact: {
                name: report_parentContact.name,
              },
              parent: {
                name: report_grandparent.name,
                contact: {
                  name: report_grandparentContact.name,
                }
              }
            }
          },
          place: {
            name: report_place.name,
            parent: {
              name: report_parent.name,
              contact: {
                name: report_parentContact.name,
              },
              parent: {
                name: report_grandparent.name,
                contact: {
                  name: report_grandparentContact.name
                }
              }
            }
          }
        });
      });
    });

    it('should hydrate linked docs for contacts, but not for reports', () => {
      return lineage
        .fetchHydratedDocs([ personWithLinks._id, placeWithLinks._id, reportWithLinks._id ])
        .then(actual => {
          expect(actual).excludingEvery('_rev').to.deep.equal([
            {
              _id: personWithLinks._id,
              name: personWithLinks.name,
              type: personWithLinks.type,
              parent: {
                _id: placeWithLinks._id,
                type: placeWithLinks.type,
                contact: place_contact,
                name: placeWithLinks.name,
                parent: {
                  _id: place_parent._id,
                  name: place_parent.name,
                  contact: place_parentContact,
                  parent: {
                    name: place_grandparent.name,
                    _id: place_grandparent._id,
                    contact: place_grandparentContact,
                  }
                },
                linked_docs: {
                  contact_tag_1: report_parent,
                  contact_tag_2: report_contact,
                  contact_tag_3: { _id: '404' },
                  report_tag_1: sms_doc,
                },
              },
              linked_docs: {
                no_tag: 'not_found',
                one_tag: person_with_circular_ids,
                other_tag: report_grandparent,
              },
            },
            {
              _id: placeWithLinks._id,
              type: placeWithLinks.type,
              contact: place_contact,
              name: placeWithLinks.name,
              parent: {
                _id: place_parent._id,
                name: place_parent.name,
                contact: place_parentContact,
                parent: {
                  name: place_grandparent.name,
                  _id: place_grandparent._id,
                  contact: place_grandparentContact,
                }
              },
              linked_docs: {
                contact_tag_1: report_parent,
                contact_tag_2: report_contact,
                contact_tag_3: { _id: '404' },
                report_tag_1: sms_doc,
              },
            },
            {
              _id: reportWithLinks._id,
              form: reportWithLinks.form,
              type: reportWithLinks.type,
              fields: reportWithLinks.fields,
              linked_docs: reportWithLinks.linked_docs,
              contact: {
                _id: report_contact._id,
                name: report_contact.name,
                type: report_contact.type,
                reported_date: report_contact.reported_date,
                parent: {
                  _id: report_parent._id,
                  name: report_parent.name,
                  contact: {
                    _id: report_parentContact._id,
                    type: report_parentContact.type,
                    reported_date: report_parentContact.reported_date,
                    phone: '+123',
                    name: report_parentContact.name,
                  },
                  parent: {
                    _id: report_grandparent._id,
                    name: report_grandparent.name,
                    contact: {
                      _id: report_grandparentContact._id,
                      type: report_grandparentContact.type,
                      reported_date: report_grandparentContact.reported_date,
                      phone: '+456',
                      name: report_grandparentContact.name,
                    }
                  }
                }
              },
            }
          ]);
        });
    });
  });
});
