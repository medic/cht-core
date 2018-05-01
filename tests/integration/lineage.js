const { expect } = require('chai');
const sinon = require('sinon').sandbox.create();
const lineageFactory = require('../../shared-libs/lineage/src/lineage');
const { db } = require('../utils');

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
const fetch_contact = {
  _id: 'fetch_contact',
  type: 'clinic',
  contact: { _id: dummyDoc2._id },
  parent: { _id: dummyDoc._id }
};
const fetch_noContact = {
  _id: 'fetch_noContact',
  type: 'clinic',
  contact: { _id: dummyDoc._id },
  parent: { _id: dummyDoc._id }
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

const docs = [
  circular_area,
  circular_chw,
  circular_report,
  dummyDoc,
  dummyDoc2,
  fetch_contact,
  fetch_noContact,
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
const docIds = docs.map(doc => doc._id);
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
  }).then(() => {
    return db.compact();
  });
};

describe('Lineage', function() {
  let lineage;

  before(function() {
    lineage = lineageFactory(Promise, db);
    return db.bulkDocs(docs).then(result => {
      console.log(result);
      return db.allDocs();
    }).then(result => {
      console.log(result);
    }).catch(error => {
      console.log('error');
      console.log(error);
    });
  });

  after(function() {
    return deleteDocs(docIds);
  });

  afterEach(function() {
    sinon.restore();
  });

  it('fetchLineageById queries db with correct parameters', function() {
    sinon.spy(db, 'query');
    const id = one_parent._id;
    return lineage.fetchLineageById(id).then(result => {
      expect(db.query.callCount).to.equal(1);
      expect(db.query.getCall(0).args[0]).to.equal('medic-client/docs_by_id_lineage');
      expect(db.query.getCall(0).args[1].startkey).to.deep.equal([ id ]);
      expect(db.query.getCall(0).args[1].endkey).to.deep.equal([ id, {} ]);
      expect(db.query.getCall(0).args[1].include_docs).to.deep.equal(true);
      expect(result).to.have.lengthOf(2);
      expect(result[0]).excluding('_rev').to.deep.equal(one_parent);
      expect(result[1]).excluding('_rev').to.deep.equal(dummyDoc);
    });
  });

  it('fetchContacts fetches contacts with correct parameters', function() {
    sinon.spy(db, 'allDocs');
    const fakeLineage = [
      { _id: 'abc', contact: { _id: 'def' }, parent: { _id: 'ghi' } },
      { _id: 'ghi' }
    ];
    return lineage.fetchContacts(fakeLineage).then(() => {
      expect(db.allDocs.callCount).to.equal(1);
      expect(db.allDocs.getCall(0).args[0]).to.deep.equal({ keys: ['def'], include_docs: true });
    });
  });

  it('fetchHydratedDoc returns errors from query', function() {
    return lineage.fetchHydratedDoc('abc').then(
      () => {
        throw new Error('should have thrown a 404');
      },
      err => {
        expect(err.status).to.equal(404);
      }
    );
  });

  it('fetchHydratedDoc returns unmodified doc when there is no lineage and no contact', function() {
    return lineage.fetchHydratedDoc('no_lineageContact').then(actual => {
      expect(actual).excluding('_rev').to.deep.equal(no_lineageContact);
    });
  });

  it('fetchHydratedDoc handles doc with unknown parent by leaving just the stub', function() {
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

  it('fetchHydratedDoc handles doc with unknown contact by leaving just the stub', function() {
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

  it('fetchHydratedDoc handles missing contacts', function() {
    return lineage.fetchHydratedDoc(no_contact._id).then(actual => {
      expect(actual).excluding('_rev').to.deep.equal(no_contact);
    });
  });

  it('fetchHydratedDoc attaches the full lineage for reports', function() {
    return lineage.fetchHydratedDoc(report._id).then(actual => {
      expect(actual.form).to.equal('A');
      // parents
      expect(actual.contact.name).to.equal(report_contact.name);
      expect(actual.contact.parent.name).to.equal(report_parent.name);
      expect(actual.contact.parent.parent.name).to.equal(report_grandparent.name);
      expect(actual.parent).to.not.exist; // jshint ignore:line
      // contacts of parents
      expect(actual.contact.parent.contact.phone).to.equal('+123');
      expect(actual.contact.parent.parent.contact.phone).to.equal('+456');
      // patient
      expect(actual.patient.name).to.equal(report_patient.name);
      // patient parents
      expect(actual.patient.parent.name).to.equal(report_contact.name);
    });
  });

  it('fetchHydratedDoc attaches the contacts', function() {
    return lineage.fetchHydratedDoc(place._id).then(actual => {
      expect(actual.name).to.equal(place.name);
      expect(actual.contact.phone).to.equal('+789');
      expect(actual.parent.name).to.equal(place_parent.name);
      expect(actual.parent.contact.phone).to.equal('+123');
      expect(actual.parent.parent.name).to.equal(place_grandparent.name);
      expect(actual.parent.parent.contact.phone).to.equal('+456');
    });
  });

  // This is a classic use-case: report from CHW who is the contact for their own area
  it('fetchHydratedDoc attaches re-used contacts, minify handles the circular references', function() {
    return lineage.fetchHydratedDoc(circular_report._id).then(actual => {
      // The contact and the contact's parent's contact are the hydrated CHW
      expect(actual.contact.parent.contact.hydrated).to.equal(true);
      expect(actual.contact.hydrated).to.equal(true);

      // And we can minifiy back to the original without error
      lineage.minify(actual);
      expect(actual).excludingEvery('_rev').to.deep.equal(circular_report);
    });
  });

  it('fetchHydratedDoc fetches contacts that it has not got via lineage', function() {
    sinon.spy(db, 'allDocs');
    return lineage.fetchHydratedDoc(fetch_contact._id).then(() => {
      expect(db.allDocs.getCall(0).args[0]).to.deep.equal({ keys: [dummyDoc2._id], include_docs: true });
    });
  });

  it('fetchHydratedDoc does not fetch contacts that it has already got via lineage', function() {
    sinon.spy(db, 'allDocs');
    return lineage.fetchHydratedDoc(fetch_noContact._id).then(() => {
      expect(db.allDocs.callCount).to.equal(0);
    });
  });

  it('fetchHydratedDoc+minify is noop on a report', function() {
    return lineage.fetchHydratedDoc(report._id).then(actual => {
      lineage.minify(actual);
      expect(actual).excluding('_rev').to.deep.equal(report);
    });
  });

  it('fetchHydratedDoc+minify is noop on a place', function() {
    return lineage.fetchHydratedDoc(place._id).then(actual => {
      lineage.minify(actual);
      expect(actual).excluding('_rev').to.deep.equal(place);
    });
  });

  it('hydrateDocs binds contacts and parents', function() {
    const docs = [ report, place ];

    return lineage.hydrateDocs(docs).then(([ hydratedReport, hydratedPlace ]) => {
      expect(hydratedReport.contact.name).to.equal(report_contact.name);
      expect(hydratedReport.parent).to.not.exist; // jshint ignore:line
      expect(hydratedReport.contact.parent.name).to.equal(report_parent.name);
      expect(hydratedReport.contact.parent.contact.name).to.equal(report_parentContact.name);
      expect(hydratedReport.contact.parent.parent.name).to.equal(report_grandparent.name);
      expect(hydratedReport.contact.parent.parent.contact.name).to.equal(report_grandparentContact.name);
      expect(hydratedReport.patient._id).to.equal(report_patient._id);

      expect(hydratedPlace.contact.name).to.equal(place_contact.name);
      expect(hydratedPlace.parent.name).to.equal(place_parent.name);
      expect(hydratedPlace.parent.contact.name).to.equal(place_parentContact.name);
      expect(hydratedPlace.parent.parent.name).to.equal(place_grandparent.name);
      expect(hydratedPlace.parent.parent.contact.name).to.equal(place_grandparentContact.name);
    });
  });

  it('hydrateDocs+minify is noop', function() {
    const docs = [ report, place ];

    return lineage.hydrateDocs(docs).then(([ hydratedReport, hydratedPlace ]) => {
      lineage.minify(hydratedReport);
      lineage.minify(hydratedPlace);
      expect(hydratedReport).excluding('_rev').to.deep.equal(report);
      expect(hydratedPlace).excluding('_rev').to.deep.equal(place);
    });
  });

  it('fetchHydratedDoc works for SMS reports', function() {
    return lineage.fetchHydratedDoc(sms_doc._id).then(actual => {
      expect(actual).excluding('_rev').to.deep.equal(sms_doc);
    });
  });

  it('hydrateDocs ignores db-fetch errors', function() {
    const docs = [ report, place ];

    return deleteDocs([place_parent._id, report_parentContact._id])
      .then(() => {
        return lineage.hydrateDocs(docs);
      })
      .then(([ hydratedReport, hydratedPlace ]) => {
        expect(hydratedReport.contact.name).to.equal(report_contact.name);
        expect(hydratedReport.parent).to.not.exist; // jshint ignore:line
        expect(hydratedReport.contact.parent.name).to.equal(report_parent.name);
        expect(hydratedReport.contact.parent.contact._id).to.equal(report_parentContact._id);
        expect(hydratedReport.contact.parent.contact.name).to.not.exist; // jshint ignore:line
        expect(hydratedReport.contact.parent.parent.name).to.equal(report_grandparent.name);
        expect(hydratedReport.contact.parent.parent.contact.name).to.equal(report_grandparentContact.name);

        expect(hydratedPlace.contact.name).to.equal(place_contact.name);
        expect(hydratedPlace.parent._id).to.equal(place_parent._id);
        expect(hydratedPlace.parent.name).to.not.exist; // jshint ignore:line
        expect(hydratedPlace.parent.contact).to.not.exist; // jshint ignore:line
        expect(hydratedPlace.parent.parent.name).to.equal(place_grandparent.name);
        expect(hydratedPlace.parent.parent.contact.name).to.equal(place_grandparentContact.name);
      });
  });
});
