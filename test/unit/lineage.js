const db = require('../../db'),
      sinon = require('sinon').sandbox.create(),
      lineage = require('../../lib/lineage');

exports.tearDown = function(callback) {
  sinon.restore();
  callback();
};

exports['hydrateDoc returns errors from view'] = test => {
  const expected = 'boom';
  const id = 'abc';
  const view = sinon.stub(db.medic, 'view').callsArgWith(3, expected);
  lineage.fetchHydratedDoc(id, err => {
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

exports['hydrateDoc returns errors from fetch'] = test => {
  const expected = 'boom';
  const docId = 'abc';
  const contactId = 'def';
  sinon.stub(db.medic, 'view').callsArgWith(3, null, {
    rows: [ { doc: { contact: { _id: contactId } } } ]
  });
  const fetch = sinon.stub(db.medic, 'fetch').callsArgWith(1, expected);
  lineage.fetchHydratedDoc(docId, err => {
    test.equals(err, expected);
    test.equals(fetch.callCount, 1);
    test.done();
  });
};

exports['hydrateDoc handles no lineage and no contact'] = test => {
  const docId = 'abc';
  const expected = { _id: docId };
  sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: [ { doc: expected } ] });
  const fetch = sinon.stub(db.medic, 'fetch').callsArgWith(1, null, { rows: [] });
  lineage.fetchHydratedDoc(docId, (err, actual) => {
    test.equals(err, null);
    test.deepEqual(actual, expected);
    test.equals(fetch.callCount, 1);
    test.done();
  });
};

exports['hydrateDoc attaches the lineage'] = test => {
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
  const fetch = sinon.stub(db.medic, 'fetch').callsArgWith(1, null, { rows: [] });
  lineage.fetchHydratedDoc(docId, (err, actual) => {
    test.equals(err, null);
    test.equals(actual.name, 'joe');
    test.equals(actual.parent.name, 'jack');
    test.equals(actual.parent.parent.name, 'jim');
    test.equals(fetch.callCount, 1);
    test.done();
  });
};


exports['hydrateDoc attaches the contacts'] = test => {
  const docId = 'abc';
  const parentContact = {
    _id: 'contact-def',
    phone: '+123'
  };
  const grandparentContact = {
    _id: 'contact-ghi',
    phone: '+456'
  };
  const givenContact = {
    _id: 'contact-abc',
    phone: '+789'
  };
  const parent = {
    _id: 'def',
    name: 'jack',
    contact: { _id: parentContact._id },
    parent: {
      _id: 'ghi'
    }
  };
  const grandparent = {
    _id: 'ghi',
    name: 'jim',
    contact: { _id: grandparentContact._id }
  };
  const given = {
    _id: docId,
    name: 'joe',
    contact: { _id: givenContact._id },
    parent: {
      _id: parent._id,
      parent: {
        _id: grandparent._id
      }
    }
  };
  const view = sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: [
    { doc: given },
    { doc: parent },
    { doc: grandparent }
  ] });
  const fetch = sinon.stub(db.medic, 'fetch').callsArgWith(1, null, { rows: [
    { doc: givenContact },
    { doc: parentContact },
    { doc: grandparentContact }
  ] });
  lineage.fetchHydratedDoc(docId, (err, actual) => {
    test.equals(err, null);
    test.equals(actual.name, 'joe');
    test.equals(actual.contact.phone, '+789');
    test.equals(actual.parent.name, 'jack');
    test.equals(actual.parent.contact.phone, '+123');
    test.equals(actual.parent.parent.name, 'jim');
    test.equals(actual.parent.parent.contact.phone, '+456');
    test.equals(view.callCount, 1);
    test.equals(view.args[0][0], 'medic-client');
    test.equals(view.args[0][1], 'docs_by_id_lineage');
    test.deepEqual(view.args[0][2].startkey, [ docId ]);
    test.deepEqual(view.args[0][2].endkey, [ docId, {} ]);
    test.equals(view.args[0][2].include_docs, true);
    test.equals(fetch.callCount, 1);
    test.deepEqual(fetch.args[0][0].keys, [ givenContact._id, parentContact._id, grandparentContact._id ]);
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
