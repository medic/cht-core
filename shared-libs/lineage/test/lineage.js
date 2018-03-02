const chai = require('chai');
const sinon = require('sinon').sandbox.create();
const lineage = require('../src/lineage');

describe('Lineage', function() {
  let allDocs,
      get,
      query,
      DB,
      report_parentContact,
      report_grandparentContact,
      report_grandparent,
      report_parent,
      report_contact,
      report_patient,
      report,
      place_parentContact,
      place_grandparentContact,
      place_contact,
      place_parent,
      place_grandparent,
      place;

  beforeEach(function() {
    allDocs = sinon.stub();
    get = sinon.stub();
    query = sinon.stub();
    DB = { allDocs, get, query };
    lineage.init({ Promise, DB });
    report_parentContact = {
      _id: 'report_parentContact',
      name: 'report_parentContact_name',
      type: 'person',
      phone: '+123'
    };
    report_grandparentContact = {
      _id: 'report_grandparentContact',
      name: 'report_grandparentContact_name',
      type: 'person',
      phone: '+456'
    };
    report_grandparent = {
      _id: 'report_grandparent',
      contact: { _id: report_grandparentContact._id },
      name: 'report_grandparent_name'
    };
    report_parent = {
      _id: 'report_parent',
      name: 'report_parent_name',
      contact: { _id: report_parentContact._id },
      parent: {
        _id: report_grandparent._id
      }
    };
    report_contact = {
      _id: 'report_contact',
      type: 'person',
      name: 'report_contact_name',
      parent: {
        _id: report_parent._id,
        parent: {
          _id: report_grandparent._id
        }
      }
    };
    report_patient = {
      _id: 'report-patient',
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
      }
    };
    report = {
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
        patient_id: 'abc123'
      }
    };

    place_parentContact = {
      _id: 'place_parentContact',
      name: 'place_parentContact_name',
      type: 'person',
      phone: '+123'
    };
    place_grandparentContact = {
      _id: 'place_grandparentContact',
      name: 'place_grandparentContact_name',
      phone: '+456'
    };
    place_contact = {
      _id: 'place_contact',
      type: 'place_contact_name',
      phone: '+789'
    };
    place_grandparent = {
      _id: 'place_grandparent',
      name: 'place_grandparent_name',
      contact: { _id: place_grandparentContact._id }
    };
    place_parent = {
      _id: 'place_parent',
      name: 'place_parent_name',
      contact: { _id: place_parentContact._id },
      parent: {
        _id: place_grandparent._id
      }
    };
    place = {
      _id: 'place',
      name: 'place_name',
      contact: { _id: place_contact._id },
      parent: {
        _id: place_parent._id,
        parent: {
          _id: place_grandparent._id
        }
      }
    };
  });

  afterEach(function() {
    sinon.restore();
  });

  it('fetchHydratedDoc returns errors from view', function() {
    const expected = { msg: 'boom' };
    const id = 'abc';
    query.rejects(expected);
    return lineage.fetchHydratedDoc(id).catch(err => {
      chai.expect(err).to.deep.equal(expected);
      chai.expect(query.callCount).to.equal(1);
      chai.expect(query.getCall(0).args[0]).to.equal('medic-client/docs_by_id_lineage');
      chai.expect(query.getCall(0).args[1].startkey).to.deep.equal([ id ]);
      chai.expect(query.getCall(0).args[1].endkey).to.deep.equal([ id, {} ]);
      chai.expect(query.getCall(0).args[1].include_docs).to.deep.equal(true);
    });
  });

  it('fetchHydratedDoc returns errors from fetch', function() {
    const expected = { msg: 'boom' };
    const docId = 'abc';
    const contactId = 'def';
    query.resolves({
      rows: [ { doc: { contact: { _id: contactId } } } ]
    });
    allDocs.rejects(expected);
    return lineage.fetchHydratedDoc(docId).catch(err => {
      chai.expect(err).to.deep.equal(expected);
      chai.expect(allDocs.callCount).to.equal(1);
    });
  });

  it('fetchHydratedDoc handles no lineage and no contact', function() {
    const docId = 'abc';
    const expected = { _id: docId };
    query.resolves({ rows: [ { doc: expected } ] });
    allDocs.resolves({ rows: [] });
    return lineage.fetchHydratedDoc(docId).then(actual => {
      chai.expect(actual).to.deep.equal(expected);
    });
  });

  it('fetchHydratedDoc handles non-lineage types with empty lineages', function() {
    const expected = { _id: 'blah-info' };
    query.resolves({ rows: [] });
    get.resolves(expected);
    return lineage.fetchHydratedDoc(expected._id).then(actual => {
      chai.expect(actual).to.deep.equal(expected);
    });
  });

  it('fetchHydratedDoc handles doc with unknown parent by leaving just the stub', function() {
    const docId = 'abc';
    query.resolves({ rows: [
      { doc: { _id: 'abc', contact: { _id: 'def' }, parent: { _id: 'ghi', parent: { _id: 'jkl' } } } },
      { doc: null },
      { doc: { _id: 'jkl', name: 'district' } }
    ] });
    allDocs.resolves({ rows: [
      { doc: { _id: 'cba' } },
      { doc: { _id: 'def' } }
    ] });
    return lineage.fetchHydratedDoc(docId)
      .then(actual => {
        chai.expect(actual).to.deep.equal({
          _id: 'abc',
          contact: { _id: 'def' },
          parent: { _id: 'ghi', parent: { _id: 'jkl', name: 'district' } }
        });
      });
  });

  it('fetchHydratedDoc handles doc with unknown contact by leaving just the stub', function() {
    const docId = 'abc';
    query.resolves({ rows: [
      { doc: { _id: 'abc', type: 'data_record', contact: { _id: 'def', parent: { _id: 'ghi', parent: { _id: 'jkl' } } } } },
      { doc: null },
      { doc: { _id: 'ghi', name: 'clinic' } },
      { doc: { _id: 'jkl', name: 'district' } }
    ] });
    allDocs.resolves({ rows: [
      { doc: { _id: 'cba' } },
      { doc: { _id: 'def', parent: { _id: 'ghi', parent: { _id: 'jkl' } } } }
    ] });
    return lineage.fetchHydratedDoc(docId)
      .then(actual => {
        chai.expect(actual).to.deep.equal({
          _id: 'abc',
          type: 'data_record',
          contact: {
            _id: 'def',
            parent: {
              _id: 'ghi',
              name: 'clinic',
              parent: {
                _id: 'jkl',
                name: 'district'
              }
            }
          }
        });
      });
  });

  it('fetchHydratedDoc handles missing contacts', function() {
    const docId = 'abc';
    query.resolves({ rows: [ { doc: { _id: 'abc', contact: { _id: 'xyz' } } } ] });
    allDocs.resolves({ rows: [ { doc: null }] });
    return lineage.fetchHydratedDoc(docId).then(actual => {
      chai.expect(actual).to.deep.equal({ _id: 'abc', contact: { _id: 'xyz' } });
    });
  });

  it('fetchHydratedDoc attaches the lineage', function() {
    const docId = 'abc';
    const parent = {
      _id: 'def',
      name: 'jack',
      parent: {
        _id: 'ghi'
      }
    };
    const grandparent = {
      _id: 'ghi',
      name: 'jim'
    };
    const given = {
      _id: docId,
      name: 'joe',
      parent: {
        _id: parent._id,
        parent: {
          _id: grandparent._id
        }
      }
    };
    query.resolves({ rows: [
      { doc: given },
      { doc: parent },
      { doc: grandparent }
    ] });
    allDocs.resolves({ rows: [] }); // without subcontacts
    return lineage.fetchHydratedDoc(docId).then(actual => {
      chai.expect(actual.name).to.equal('joe');
      chai.expect(actual.parent.name).to.equal('jack');
      chai.expect(actual.parent.parent.name).to.equal('jim');
    });
  });

  it('fetchHydratedDoc attaches the full lineage for reports', function() {
    // sinon.stub(utils, 'getPatientContactUuid').callsArgWith(2, null, report_patient._id);
    query.onCall(0).resolves({ rows: [
      { doc: report },
      { doc: report_contact },
      { doc: report_parent },
      { doc: report_grandparent }
    ] });
    query.onCall(1).resolves({ rows: [
      { doc: report_patient },
      { doc: report_contact },
      { doc: report_parent },
      { doc: report_grandparent }
    ] });
    query.onCall(3).rejects('Too many calls!');

    allDocs.callsFake((options) => {
      const contactDocs = options.keys.map(id => {
        return [ report_contact, report_parentContact, report_grandparentContact, report_patient ]
          .find(contact => contact._id === id);
      });
      return Promise.resolve({ rows: contactDocs.map(doc => { return {doc: doc}; }) });
    });

    lineage.fetchHydratedDoc(report._id).then(actual => {
      chai.expect(actual.form).to.equal('A');
      // parents
      chai.expect(actual.contact.name).to.equal(report_contact.name);
      chai.expect(actual.contact.parent.name).to.equal(report_parent.name);
      chai.expect(actual.contact.parent.parent.name).to.equal(report_grandparent.name);
      chai.expect(actual.parent).to.not.exist;
      // contacts of parents
      chai.expect(actual.contact.parent.contact.phone).to.equal('+123');
      chai.expect(actual.contact.parent.parent.contact.phone).to.equal('+456');
      // patient
      chai.expect(actual.patient.name).to.equal(report_patient.name);
      // patient parents
      chai.expect(actual.patient.parent.name).to.equal(report_contact.name);

      chai.expect(fetch.callCount).to.equal(1);
    });
  });

  it('fetchHydratedDoc attaches the contacts', function() {
    query.resolves({ rows: [
      { doc: place },
      { doc: place_parent },
      { doc: place_grandparent }
    ] });
    allDocs.resolves({ rows: [
      { doc: place_contact },
      { doc: place_parentContact },
      { doc: place_grandparentContact }
    ] });
    return lineage.fetchHydratedDoc(place._id).then(actual => {
      chai.expect(actual.name).to.equal(place.name);
      chai.expect(actual.contact.phone).to.equal('+789');
      chai.expect(actual.parent.name).to.equal(place_parent.name);
      chai.expect(actual.parent.contact.phone).to.equal('+123');
      chai.expect(actual.parent.parent.name).to.equal(place_grandparent.name);
      chai.expect(actual.parent.parent.contact.phone).to.equal('+456');
      chai.expect(query.callCount).to.equal(1);
      chai.expect(query.getCall(0).args[0]).to.equal('medic-client/docs_by_id_lineage');
      chai.expect(query.getCall(0).args[1].startkey).to.deep.equal([ place._id ]);
      chai.expect(query.getCall(0).args[1].endkey).to.deep.equal([ place._id, {} ]);
      chai.expect(query.getCall(0).args[1].include_docs).to.equal(true);
      chai.expect(allDocs.callCount).to.equal(1);
      chai.expect(allDocs.getCall(0).args[0].keys).to.deep.equal([ place_contact._id, place_parentContact._id, place_grandparentContact._id ]);
    });
  });

  // This is a classic use-case: report from CHW who is the contact for their own area
  it('fetchHydratedDoc attaches re-used contacts, minify handles the circular references', function() {
    const docId = 'docId';
    const chwId = 'chwId';
    const areaId = 'areaId';

    const doc = {type: 'data_record', _id: docId, contact: {_id: chwId, parent: {_id: areaId}}};
    const chw = {type: 'person', _id: chwId, parent: {_id: areaId}, hydrated: true};
    const area = {type: 'clinic', _id: areaId, contact: {_id: chwId }};

    query.resolves({ rows: [
      { doc: doc},
      { doc: chw},
      { doc: area},
    ]});
    allDocs.rejects(Error('Calling fetch should not be required'));
    return lineage.fetchHydratedDoc(docId).then(actual => {
      // The contact and the contact's parent's contact are the hydrated CHW
      chai.expect(actual.contact.parent.contact.hydrated).to.equal(true);
      chai.expect(actual.contact.hydrated).to.equal(true);

      // And we can minifiy back to the original without error
      lineage.minify(actual);
      chai.expect(actual).to.deep.equal(doc);
    });
  });

  // Same as above but expanded to need to pull _some_ contacts
  it('fetchHydratedDoc only fetches contacts that it has not got via lineage', function() {
    const docId = 'docId';
    const chwId = 'chwId';
    const areaId = 'areaId';
    const dhId = 'dhId';
    const dhContactId = 'dhContactId';

    const doc = {type: 'data_record', _id: docId, contact: {_id: chwId, parent: {_id: areaId, parent: {_id: dhId}}}};
    const chw = {type: 'person', _id: chwId, parent: {_id: areaId, parent: {_id: dhId}}, hydrated: true};
    const area = {type: 'clinic', _id: areaId, contact: {_id: chwId }, parent: {_id: dhId}};
    const dh = {type: 'district-hospital', _id: dhId, contact: {_id: dhContactId}};
    const dhContact = {type: 'person', _id: dhContactId, hydrated: true};

    query.resolves({ rows: [
      { doc: doc},
      { doc: chw},
      { doc: area},
      { doc: dh}
    ]});
    allDocs.resolves({ rows: [{doc: dhContact}]});
    return lineage.fetchHydratedDoc(docId).then(actual => {
      chai.expect(actual.contact.hydrated).to.equal(true);
      chai.expect(actual.contact.parent.contact.hydrated).to.equal(true);
      chai.expect(actual.contact.parent.parent.contact.hydrated).to.equal(true);

      chai.expect(allDocs.getCall(0).args[0]).to.deep.equal({ keys: [dhContactId], include_docs: true });
    });
  });

  it('minify handles null argument', function() {
    lineage.minify(null);
    // just make sure it doesn't blow up!
  });

  it('minify minifies the parent', function() {
    const actual = {
      _id: 'c',
      name: 'cathy',
      parent: {
        _id: 'a',
        name: 'arnold',
        parent: {
          _id: 'b',
          name: 'barry'
        }
      }
    };
    const expected = {
      _id: 'c',
      name: 'cathy',
      parent: {
        _id: 'a',
        parent: {
          _id: 'b'
        }
      }
    };
    lineage.minify(actual);
    chai.expect(actual).to.deep.equal(expected);
  });

  it('minify minifies the contact and lineage', function() {
    const actual = {
      _id: 'c',
      name: 'cathy',
      parent: {
        _id: 'a',
        name: 'arnold',
        parent: {
          _id: 'b',
          name: 'barry'
        }
      },
      contact: {
        _id: 'd',
        name: 'daniel',
        parent: {
          _id: 'e',
          name: 'elisa'
        }
      }
    };
    const expected = {
      _id: 'c',
      name: 'cathy',
      parent: {
        _id: 'a',
        parent: {
          _id: 'b'
        }
      },
      contact: {
        _id: 'd',
        parent: {
          _id: 'e'
        }
      }
    };
    lineage.minify(actual);
    chai.expect(actual).to.deep.equal(expected);
  });

  it('minify removes the patient', function() {
    const actual = {
      _id: 'c',
      type: 'data_record',
      patient_id: '123',
      patient: {
        _id: 'a',
        name: 'Alice',
        patient_id: '123',
        parent: {
          _id: 'b',
          name: 'Bob'
        }
      }
    };
    const expected = {
      _id: 'c',
      type: 'data_record',
      patient_id: '123'
    };
    lineage.minify(actual);
    chai.expect(actual).to.deep.equal(expected);
  });

  it('fetchHydratedDoc+minify is noop on a report', function() {
    // sinon.stub(utils, 'getPatientContactUuid').callsArgWith(2, null, report_patient._id);
    query.onCall(0).resolves({ rows: [
      { doc: JSON.parse(JSON.stringify(report)) },
      { doc: report_contact },
      { doc: report_parent },
      { doc: report_grandparent }
    ] });
    query.onCall(1).resolves({ rows: [
      { doc: report_patient },
      { doc: report_contact },
      { doc: report_parent },
      { doc: report_grandparent }
    ] });

    allDocs.callsFake((options) => {
      const contactDocs = options.keys.map(id => {
        return [ report_contact, report_parentContact, report_grandparentContact, report_patient ]
          .find(contact => contact._id === id);
      });
      return Promise.resolve({ rows: contactDocs.map(doc => { return {doc: doc}; }) });
    });

    return lineage.fetchHydratedDoc(report._id).then(actual => {
      lineage.minify(actual);
      chai.expect(actual).to.deep.equal(report);
    });
  });

  it('fetchHydratedDoc+minify is noop on a place', function() {
    query.resolves({ rows: [
      { doc: JSON.parse(JSON.stringify(place)) },
      { doc: place_parent },
      { doc: place_grandparent }
    ] });

    allDocs.callsFake((options) => {
      const contactDocs = options.keys.map(id => {
        return [ place_contact, place_parentContact, place_grandparentContact ]
          .find(contact => contact._id === id);
      });
      return Promise.resolve({ rows: contactDocs.map(doc => { return {doc: doc}; }) });
    });

    return lineage.fetchHydratedDoc(place._id).then(actual => {
      lineage.minify(actual);
      chai.expect(actual).to.deep.equal(place);
    });
  });

  it.only('hydrateDocs binds contacts and parents', function() {
    const docs = [ report, place ];

    const fetchedParents = [ report_parent, report_grandparent, report_contact, place_parent, place_grandparent ];
    const fetchedContacts = [ report_parentContact, report_grandparentContact, place_contact, place_parentContact, place_grandparentContact ];
    const rowify = docs => ({ rows: docs.map(doc => ({ id: doc._id, doc: doc })) });

    allDocs.onCall(0).resolves(rowify(fetchedParents));
    allDocs.onCall(1).resolves(rowify(fetchedContacts));

    // sinon.stub(utils, 'getPatientContactUuid').callsArgWith(2, null, report_patient._id);
    query.onCall(0).resolves({ rows: [
      { doc: report_patient }
    ] });

    return lineage.hydrateDocs(docs).then(([ hydratedReport, hydratedPlace ]) => {
      chai.expect(allDocs.callCount).to.equal(2);
      chai.expect(allDocs.getCall(0).args[0].keys.sort()).to.deep.equal(fetchedParents.map(doc => doc._id).sort());
      chai.expect(allDocs.getCall(0).args[0].keys.sort()).to.deep.equal(fetchedContacts.map(doc => doc._id).sort());

      chai.expect(hydratedReport.contact.name).to.equal(report_contact.name);
      chai.expect(hydratedReport.parent).to.equal(null);
      chai.expect(hydratedReport.contact.parent.name).to.equal(report_parent.name);
      chai.expect(hydratedReport.contact.parent.contact.name).to.equal(report_parentContact.name);
      chai.expect(hydratedReport.contact.parent.parent.name).to.equal(report_grandparent.name);
      chai.expect(hydratedReport.contact.parent.parent.contact.name).to.equal(report_grandparentContact.name);
      chai.expect(hydratedReport.patient._id).to.equal(report_patient._id);

      chai.expect(hydratedPlace.contact.name).to.equal(place_contact.name);
      chai.expect(hydratedPlace.parent.name).to.equal(place_parent.name);
      chai.expect(hydratedPlace.parent.contact.name).to.equal(place_parentContact.name);
      chai.expect(hydratedPlace.parent.parent.name).to.equal(place_grandparent.name);
      chai.expect(hydratedPlace.parent.parent.contact.name).to.equal(place_grandparentContact.name);
    });
  });

  it('hydrateDocs works on empty array', function() {
    const docs = [];
    return lineage.hydrateDocs(docs).then((hydratedDocs) => {
      chai.expect(hydratedDocs).to.have.length(0);
    });
  });

  it('hydrateDocs works on docs without contacts or parents', function() {
    const docs = [
      { _id: 'a' },
      { _id: 'b' },
    ];
    return lineage.hydrateDocs(docs).then((hydratedDocs) => {
      chai.expect(hydratedDocs).to.deep.equal(docs);
    });
  });

  it('hydrateDocs+minify is noop', function() {
    const docs = [ report, place ];

    const fetchedParents = [ report_parent, report_grandparent, report_contact, place_parent, place_grandparent ];
    const fetchedContacts = [ report_parentContact, report_grandparentContact, place_contact, place_parentContact, place_grandparentContact ];
    const rowify = docs => ({ rows: docs.map(doc => ({ id: doc._id, doc: doc })) });

    allDocs.onCall(0).resolves(rowify(fetchedParents));
    allDocs.onCall(1).resolves(rowify(fetchedContacts));

    // sinon.stub(utils, 'getPatientContactUuid').callsArgWith(2, null, report_patient._id);
    query.onCall(0).resolves({ rows: [
      { doc: report_patient }
    ] });

    return lineage.hydrateDocs(docs).then(([ hydratedReport, hydratedPlace ]) => {
      lineage.minify(hydratedReport);
      lineage.minify(hydratedPlace);
      chai.expect(hydratedReport).to.deep.equal(report);
      chai.expect(hydratedPlace).to.deep.equal(place);
    });
  });

  it('hydrateDocs ignores db-fetch errors', function() {
    const docs = [ report, place ];

    const fetchedParents = [ report_parent, report_grandparent, report_contact, place_parent, place_grandparent ];
    const fetchedContacts = [ report_parentContact, report_grandparentContact, place_contact, place_parentContact, place_grandparentContact ];
    const rowify = docs => ({ rows: docs.map(doc => ({ id: doc._id, doc: doc })) });

    const fetchedParentsRows = rowify(fetchedParents);
    fetchedParentsRows.rows[3].doc = null; // place_parent
    const fetchedContactsRows = rowify(fetchedContacts);
    fetchedContactsRows.rows[0].doc = null; // report_parentContact

    allDocs.onCall(0).resolves(fetchedParentsRows);
    allDocs.onCall(1).resolves(fetchedContactsRows);

    // sinon.stub(utils, 'getPatientContactUuid').callsArgWith(2, null, report_patient._id);
    query.onCall(0).resolves({ rows: [
      { doc: report_patient }
    ] });

    return lineage.hydrateDocs(docs).then(([ hydratedReport, hydratedPlace ]) => {
      chai.expect(hydratedReport.contact.name).to.equal(report_contact.name);
      chai.expect(hydratedReport.parent).to.not.exist;
      chai.expect(hydratedReport.contact.parent.name).to.equal(report_parent.name);
      chai.expect(hydratedReport.contact.parent.contact._id).to.equal(report_parentContact._id);
      chai.expect(hydratedReport.contact.parent.contact.name).to.not.exist; // db-fetch error : not hydrated
      chai.expect(hydratedReport.contact.parent.parent.name).to.equal(report_grandparent.name);
      chai.expect(hydratedReport.contact.parent.parent.contact.name).to.equal(report_grandparentContact.name);

      chai.expect(hydratedPlace.contact.name).to.equal(place_contact.name);
      chai.expect(hydratedPlace.parent._id).to.equal(place_parent._id);
      chai.expect(hydratedPlace.parent.name).to.not.exist; // db-fetch error : not hydrated
      chai.expect(hydratedPlace.parent.contact).to.not.exist; // db-fetch error : not hydrated
      chai.expect(hydratedPlace.parent.parent.name).to.equal(place_grandparent.name);
      chai.expect(hydratedPlace.parent.parent.contact.name).to.equal(place_grandparentContact.name);
    });
  });

  it('fetchHydratedDoc works for SMS reports', function() {
    let doc = {
      _id: 'some_id',
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

    query.onCall(0).resolves({ rows: [{ doc: doc }] });
    return lineage
      .fetchHydratedDoc(doc._id)
      .then(() => {
        chai.expect(query.callCount).to.equal(1);
      });
  });
});
