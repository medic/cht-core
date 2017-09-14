const db = require('../../db'),
      sinon = require('sinon').sandbox.create(),
      lineage = require('../../lib/lineage');

exports.tearDown = callback => {
  sinon.restore();
  callback();
};

let report_parentContact,
  report_grandparentContact,
  report_grandparent,
  report_parent,
  report_contact,
  report,
  place_parentContact,
  place_grandparentContact,
  place_contact,
  place_parent,
  place_grandparent,
  place;

exports.setUp = callback => {
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
  callback();
};

exports['fetchHydratedDoc returns errors from view'] = test => {
  const expected = 'boom';
  const id = 'abc';
  const view = sinon.stub(db.medic, 'view').callsArgWith(3, expected);
  lineage.fetchHydratedDoc(id).catch(err => {
    test.equals(err, expected);
    test.equals(view.callCount, 1);
    test.equals(view.args[0][0], 'medic-client');
    test.equals(view.args[0][1], 'docs_by_id_lineage');
    test.deepEqual(view.args[0][2].startkey, [ id ]);
    test.deepEqual(view.args[0][2].endkey, [ id, {} ]);
    test.deepEqual(view.args[0][2].include_docs, true);
    test.done();
  });
};

exports['fetchHydratedDoc returns errors from fetch'] = test => {
  const expected = 'boom';
  const docId = 'abc';
  const contactId = 'def';
  sinon.stub(db.medic, 'view').callsArgWith(3, null, {
    rows: [ { doc: { contact: { _id: contactId } } } ]
  });
  const fetch = sinon.stub(db.medic, 'fetch').callsArgWith(1, expected);
  lineage.fetchHydratedDoc(docId).catch(err => {
    test.equals(err, expected);
    test.equals(fetch.callCount, 1);
    test.done();
  }).catch(test.done);
};

exports['fetchHydratedDoc handles no lineage and no contact'] = test => {
  const docId = 'abc';
  const expected = { _id: docId };
  sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: [ { doc: expected } ] });
  sinon.stub(db.medic, 'fetch').callsArgWith(1, null, { rows: [] });
  lineage.fetchHydratedDoc(docId).then(actual => {
    test.deepEqual(actual, expected);
    test.done();
  });
};

exports['fetchHydratedDoc handles doc with deleted parent'] = test => {
  const docId = 'abc';
  sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: [ { doc: { _id: 'abc' } }, { doc: null } ] });
  sinon.stub(db.medic, 'fetch').callsArgWith(1, null, { rows: [ { doc: { _id: 'cba' } } ] });
  lineage.fetchHydratedDoc(docId)
  .then(actual => {
    test.deepEqual(actual, { _id: 'abc', parent: null });
    test.done();
  })
  .catch(err => {
    test.fail(err);
    test.done();
  });
};

exports['fetchHydratedDoc handles missing contacts'] = test => {
  const docId = 'abc';
  sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: [ { doc: { _id: 'abc', contact: { _id: 'xyz' } } } ] });
  sinon.stub(db.medic, 'fetch').callsArgWith(1, null, { rows: [ { doc: null }] });
  lineage.fetchHydratedDoc(docId).then(actual => {
    test.deepEqual(actual, { _id: 'abc', contact: { _id: 'xyz' }, parent: undefined });
    test.done();
  });
};

exports['fetchHydratedDoc attaches the lineage'] = test => {
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
  sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: [
    { doc: given },
    { doc: parent },
    { doc: grandparent }
  ] });
  sinon.stub(db.medic, 'fetch').callsArgWith(1, null, { rows: [] }); // without subcontacts
  lineage.fetchHydratedDoc(docId).then(actual => {
    test.equals(actual.name, 'joe');
    test.equals(actual.parent.name, 'jack');
    test.equals(actual.parent.parent.name, 'jim');
    test.done();
  });
};

exports['fetchHydratedDoc attaches the full lineage for reports'] = test => {
  sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: [
    { doc: report },
    { doc: report_contact },
    { doc: report_parent },
    { doc: report_grandparent }
  ] });

  const fetch = sinon.stub(db.medic, 'fetch');
  fetch.callsFake((options, callback) => {
    const contactDocs = options.keys.map(id => {
      return [ report_contact, report_parentContact, report_grandparentContact ]
        .find(contact => contact._id === id);
    });
    callback(null, { rows: contactDocs.map(doc => { return {doc: doc}; }) });
  });

  lineage.fetchHydratedDoc(report._id).then(actual => {
    test.equals(actual.form, 'A');
    // parents
    test.equals(actual.contact.name, report_contact.name);
    test.equals(actual.contact.parent.name, report_parent.name);
    test.equals(actual.contact.parent.parent.name, report_grandparent.name);
    test.ok(!actual.parent);
    // contacts of parents
    test.equals(actual.contact.parent.contact.phone, '+123');
    test.equals(actual.contact.parent.parent.contact.phone, '+456');

    test.equals(fetch.callCount, 1);
    test.done();
  });
};

exports['fetchHydratedDoc attaches the contacts'] = test => {
  const view = sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: [
    { doc: place },
    { doc: place_parent },
    { doc: place_grandparent }
  ] });
  const fetch = sinon.stub(db.medic, 'fetch').callsArgWith(1, null, { rows: [
    { doc: place_contact },
    { doc: place_parentContact },
    { doc: place_grandparentContact }
  ] });
  lineage.fetchHydratedDoc(place._id).then(actual => {
    test.equals(actual.name, place.name);
    test.equals(actual.contact.phone, '+789');
    test.equals(actual.parent.name, place_parent.name);
    test.equals(actual.parent.contact.phone, '+123');
    test.equals(actual.parent.parent.name, place_grandparent.name);
    test.equals(actual.parent.parent.contact.phone, '+456');
    test.equals(view.callCount, 1);
    test.equals(view.args[0][0], 'medic-client');
    test.equals(view.args[0][1], 'docs_by_id_lineage');
    test.deepEqual(view.args[0][2].startkey, [ place._id ]);
    test.deepEqual(view.args[0][2].endkey, [ place._id, {} ]);
    test.equals(view.args[0][2].include_docs, true);
    test.equals(fetch.callCount, 1);
    test.deepEqual(fetch.args[0][0].keys, [ place_contact._id, place_parentContact._id, place_grandparentContact._id ]);
    test.done();
  });
};

// This is a classic use-case: report from CHW who is the contact for their own area
exports['fetchHydratedDoc attaches re-used contacts, minify handles the circular references'] = test => {
  const docId = 'docId';
  const chwId = 'chwId';
  const areaId = 'areaId';

  const doc = {type: 'data_record', _id: docId, contact: {_id: chwId, parent: {_id: areaId}}};
  const chw = {type: 'person', _id: chwId, parent: {_id: areaId}, hydrated: true};
  const area = {type: 'clinic', _id: areaId, contact: {_id: chwId }};

  sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: [
    { doc: doc},
    { doc: chw},
    { doc: area},
  ]});
  sinon.stub(db.medic, 'fetch').callsArgWith(1, null, { rows: [
    { doc: chw },
    { doc: chw }
  ]});
  lineage.fetchHydratedDoc(docId).then(actual => {
    // The contact and the contact's parent's contact are the hydrated CHW
    test.equal(actual.contact.parent.contact.hydrated, true);
    test.equal(actual.contact.hydrated, true);

    // And we can minifiy back to the original without error
    lineage.minify(actual);
    test.deepEqual(actual, doc);

    test.done();
  });
};

exports['minify handles null argument'] = test => {
  lineage.minify(null);
  // just make sure it doesn't blow up!
  test.done();
};

exports['minify minifies the parent'] = test => {
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
  test.deepEqual(actual, expected);
  test.done();
};

exports['minify minifies the contact and lineage'] = test => {
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
  test.deepEqual(actual, expected);
  test.done();
};

exports['fetchHydratedDoc+minify is noop on a report'] = test => {
  sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: [
    { doc: JSON.parse(JSON.stringify(report)) },
    { doc: report_contact },
    { doc: report_parent },
    { doc: report_grandparent }
  ] });

  const fetch = sinon.stub(db.medic, 'fetch');
  fetch.callsFake((options, callback) => {
    const contactDocs = options.keys.map(id => {
      return [ report_contact, report_parentContact, report_grandparentContact ]
        .find(contact => contact._id === id);
    });
    callback(null, { rows: contactDocs.map(doc => { return {doc: doc}; }) });
  });

  lineage.fetchHydratedDoc(report._id).then(actual => {
    lineage.minify(actual);
    test.deepEqual(actual, report);
    test.done();
  });
};

exports['fetchHydratedDoc+minify is noop on a place'] = test => {
  sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: [
    { doc: JSON.parse(JSON.stringify(place)) },
    { doc: place_parent },
    { doc: place_grandparent }
  ] });

  const fetch = sinon.stub(db.medic, 'fetch');
  fetch.callsFake((options, callback) => {
    const contactDocs = options.keys.map(id => {
      return [ place_contact, place_parentContact, place_grandparentContact ]
        .find(contact => contact._id === id);
    });
    callback(null, { rows: contactDocs.map(doc => { return {doc: doc}; }) });
  });

  lineage.fetchHydratedDoc(place._id).then(actual => {
    lineage.minify(actual);
    test.deepEqual(actual, place);
    test.done();
  });
};

exports['hydrateDocs binds contacts and parents'] = test => {
  const docs = [ report, place ];

  const fetchedParents = [ report_parent, report_grandparent, report_contact, place_parent, place_grandparent ];
  const fetchedContacts = [ report_parentContact, report_grandparentContact, place_contact, place_parentContact, place_grandparentContact ];
  const rowify = docs => ({ rows: docs.map(doc => ({ id: doc._id, doc: doc })) });

  const fetch = sinon.stub(db.medic, 'fetch');
  fetch.onCall(0).callsArgWith(1, null, rowify(fetchedParents));
  fetch.onCall(1).callsArgWith(1, null, rowify(fetchedContacts));

  lineage.hydrateDocs(docs).then(([ hydratedReport, hydratedPlace ]) => {
    test.equals(fetch.callCount, 2);
    test.deepEqual(fetch.args[0][0].keys.sort(), fetchedParents.map(doc => doc._id).sort());
    test.deepEqual(fetch.args[1][0].keys.sort(), fetchedContacts.map(doc => doc._id).sort());

    test.equals(hydratedReport.contact.name, report_contact.name);
    test.equals(hydratedReport.parent, null);
    test.equals(hydratedReport.contact.parent.name, report_parent.name);
    test.equals(hydratedReport.contact.parent.contact.name, report_parentContact.name);
    test.equals(hydratedReport.contact.parent.parent.name, report_grandparent.name);
    test.equals(hydratedReport.contact.parent.parent.contact.name, report_grandparentContact.name);

    test.equals(hydratedPlace.contact.name, place_contact.name);
    test.equals(hydratedPlace.parent.name, place_parent.name);
    test.equals(hydratedPlace.parent.contact.name, place_parentContact.name);
    test.equals(hydratedPlace.parent.parent.name, place_grandparent.name);
    test.equals(hydratedPlace.parent.parent.contact.name, place_grandparentContact.name);

    test.done();
  }).catch(test.done);
};

exports['hydrateDocs works on empty array'] = test => {
  const docs = [];
  lineage.hydrateDocs(docs).then((hydratedDocs) => {
    test.equals(hydratedDocs.length, 0);
    test.done();
  });
};

exports['hydrateDocs works on docs without contacts or parents'] = test => {
  const docs = [
    { _id: 'a' },
    { _id: 'b' },
  ];
  lineage.hydrateDocs(docs).then((hydratedDocs) => {
    test.deepEqual(hydratedDocs, docs);
    test.done();
  });
};

exports['hydrateDocs+minify is noop'] = test => {
  const docs = [ report, place ];

  const fetchedParents = [ report_parent, report_grandparent, report_contact, place_parent, place_grandparent ];
  const fetchedContacts = [ report_parentContact, report_grandparentContact, place_contact, place_parentContact, place_grandparentContact ];
  const rowify = docs => ({ rows: docs.map(doc => ({ id: doc._id, doc: doc })) });

  const fetch = sinon.stub(db.medic, 'fetch');
  fetch.onCall(0).callsArgWith(1, null, rowify(fetchedParents));
  fetch.onCall(1).callsArgWith(1, null, rowify(fetchedContacts));

  lineage.hydrateDocs(docs).then(([ hydratedReport, hydratedPlace ]) => {
    lineage.minify(hydratedReport);
    lineage.minify(hydratedPlace);
    test.deepEqual(hydratedReport, report);
    test.deepEqual(hydratedPlace, place);
    test.done();
  });
};

exports['hydrateDocs ignores db-fetch errors'] = test => {
  const docs = [ report, place ];

  const fetchedParents = [ report_parent, report_grandparent, report_contact, place_parent, place_grandparent ];
  const fetchedContacts = [ report_parentContact, report_grandparentContact, place_contact, place_parentContact, place_grandparentContact ];
  const rowify = docs => ({ rows: docs.map(doc => ({ id: doc._id, doc: doc })) });

  const fetchedParentsRows = rowify(fetchedParents);
  fetchedParentsRows.rows[3].doc = null; // place_parent
  const fetchedContactsRows = rowify(fetchedContacts);
  fetchedContactsRows.rows[0].doc = null; // report_parentContact

  const fetch = sinon.stub(db.medic, 'fetch');
  fetch.onCall(0).callsArgWith(1, null, fetchedParentsRows);
  fetch.onCall(1).callsArgWith(1, null, fetchedContactsRows);

  lineage.hydrateDocs(docs).then(([ hydratedReport, hydratedPlace ]) => {
    test.equals(hydratedReport.contact.name, report_contact.name);
    test.equals(hydratedReport.parent, null);
    test.equals(hydratedReport.contact.parent.name, report_parent.name);
    test.equals(hydratedReport.contact.parent.contact._id, report_parentContact._id);
    test.equals(hydratedReport.contact.parent.contact.name, null); // db-fetch error : not hydrated
    test.equals(hydratedReport.contact.parent.parent.name, report_grandparent.name);
    test.equals(hydratedReport.contact.parent.parent.contact.name, report_grandparentContact.name);

    test.equals(hydratedPlace.contact.name, place_contact.name);
    test.equals(hydratedPlace.parent._id, place_parent._id);
    test.equals(hydratedPlace.parent.name, null); // db-fetch error : not hydrated
    test.equals(hydratedPlace.parent.contact, null); // db-fetch error : not hydrated
    test.equals(hydratedPlace.parent.parent.name, place_grandparent.name);
    test.equals(hydratedPlace.parent.parent.contact.name, place_grandparentContact.name);

    test.done();
  }).catch(test.done);

};

