var sinon = require('sinon'),
    db = require('../../db'),
    people = require('../../controllers/people'),
    places = require('../../controllers/places'),
    utils = require('../utils'),
    migration = require('../../migrations/extract-person-contacts');

var createPerson, getDoc, getView, insertDoc, updatePlace;

exports.setUp = function(done) {
  getView = sinon.stub(db.medic, 'view');
  getDoc = sinon.stub(db.medic, 'get');
  insertDoc = sinon.stub(db.medic, 'insert');
  updatePlace = sinon.stub(places, 'updatePlace');
  createPerson = sinon.stub(people, 'createPerson');
  done();
};

exports.tearDown = function (callback) {
  utils.restore(db.medic.view, db.medic.get, db.medic.insert, people.createPerson, places.updatePlace);
  callback();
};

exports['run does nothing if no facilities'] = function(test) {
  test.expect(6);
  getView.callsArgWith(3, null, { rows: [] });
  getDoc.callsArgWith(1, null, {  });
  migration.run(function(err) {
    test.equals(err, undefined);
    // Called once per place type.
    test.equals(getView.callCount, 3);
    test.equals(getDoc.callCount, 0);
    // No edits happened.
    test.equals(insertDoc.callCount, 0);
    test.equals(updatePlace.callCount, 0);
    test.equals(createPerson.callCount, 0);
    test.done();
  });
};

var testParentUpdated = function(test, doc, docWithoutParent) {
  test.expect(13);

  // Get the 3 levels of hierarchy
  getView.onCall(0).callsArgWith(3, null, { rows: [ { id: 'a' }] });
  getView.onCall(1).callsArgWith(3, null, { rows: [ ] });
  getView.onCall(2).callsArgWith(3, null, { rows: [ ] });

  // Get doc for parent update
  getDoc.onCall(0).callsArgWith(1, null, doc);
  // Get parent doc
  getDoc.onCall(1).callsArgWith(1, null, { _id: 'b', contact: {}, newKey: 'newValue' });
  getDoc.onCall(2).callsArgWith(1, null, { _id: 'b', contact: {}, newKey: 'newValue' });

  // Update doc : deleted parent
  insertDoc.onCall(0).callsArgWith(1, null);
  // Update doc : update the parent field
  updatePlace.onCall(0).callsArgWith(2, null);
  // Get doc for contact update : no contact, so skipped.
  getDoc.onCall(3).callsArgWith(1, null, { _id: 'a', parent: { _id: 'b'} });

  migration.run(function(err) {
    test.equals(err, undefined);
    // Called once per place type.
    test.equals(getView.callCount, 3);

    test.equals(getDoc.callCount, 4);
    test.equals(getDoc.firstCall.args[0], 'a');
    test.equals(getDoc.secondCall.args[0], 'b');
    test.equals(getDoc.thirdCall.args[0], 'b');
    test.equals(getDoc.lastCall.args[0], 'a');

    // Parent was deleted, then reset.
    test.equals(insertDoc.callCount, 1);
    test.deepEqual(insertDoc.firstCall.args[0], docWithoutParent);
    test.equals(updatePlace.callCount, 1);
    test.equals(updatePlace.firstCall.args[0], 'a');
    test.deepEqual(updatePlace.firstCall.args[1], { parent: 'b'});

    // No contact created.
    test.equals(createPerson.callCount, 0);

    test.done();
  });
};

exports['run still updates parent if facility have no contact'] = function(test) {
  testParentUpdated(
    test,
    {
      _id: 'a',
      parent: { _id: 'b', contact: {}}
    },
    {
      _id: 'a',
    });
};

exports['run still updates parent if facility has migrated contact'] = function(test) {
  testParentUpdated(test,
    {
      _id: 'a',
      parent: { _id: 'b', contact: {}},
      contact: { _id: 'd' }
    },
    {
      _id: 'a',
      contact: { _id: 'd' }
    });
};

var testContactUpdated = function(test, doc, docWithoutContact) {
  test.expect(12);

  // Get the 3 levels of hierarchy
  getView.onCall(0).callsArgWith(3, null, { rows: [ { id: 'a' }] });
  getView.onCall(1).callsArgWith(3, null, { rows: [ ] });
  getView.onCall(2).callsArgWith(3, null, { rows: [ ] });

  // Get doc for parent update : no parent, so parent update is skipped.
  getDoc.onCall(0).callsArgWith(1, null, doc);
  // Get doc for contact update.
  getDoc.onCall(1).callsArgWith(1, null, doc);
  // Update doc : deleted contact
  insertDoc.onCall(0).callsArgWith(1, null);
  // Create person doc
  createPerson.onCall(0).callsArgWith(1, null, { id: 'c'});
  // Update doc : reset the contact field
  updatePlace.onCall(0).callsArgWith(2, null);

  migration.run(function(err) {
    test.equals(err, undefined);
    // Called once per place type.
    test.equals(getView.callCount, 3);

    test.equals(getDoc.callCount, 2);
    test.equals(getDoc.firstCall.args[0], 'a');
    test.equals(getDoc.secondCall.args[0], 'a');

    // Contact was deleted, then reset.
    test.equals(insertDoc.callCount, 1);
    test.deepEqual(insertDoc.firstCall.args[0], docWithoutContact);
    test.equals(updatePlace.callCount, 1);
    test.equals(updatePlace.firstCall.args[0], 'a');
    test.deepEqual(updatePlace.firstCall.args[1], { contact: 'c'});

    // Contact was created.
    test.equals(createPerson.callCount, 1);
    test.deepEqual(createPerson.firstCall.args[0], {
        name: 'name',
        phone: 'phone',
        place: 'a'
      });

    test.done();
  });

};

exports['run still updates contact if facility has no parent'] = function(test) {
  testContactUpdated(
    test,
    { _id: 'a', contact: { name: 'name', 'phone': 'phone'} },
    { _id: 'a'});
};


exports['run still updates contact if facility has migrated parent'] = function(test) {
  testContactUpdated(
    test,
    {
      _id: 'a',
      contact: { name: 'name', 'phone': 'phone'},
      parent: {_id: 'b', contact: {_id: 'f'}}
    },
    {
      _id: 'a',
      parent: {_id: 'b', contact: {_id: 'f'}}
    });
};

exports['run updates contact and parent'] = function(test) {
  test.expect(17);

  // Get the 3 levels of hierarchy
  getView.onCall(0).callsArgWith(3, null, { rows: [ { id: 'a' }] });
  getView.onCall(1).callsArgWith(3, null, { rows: [ ] });
  getView.onCall(2).callsArgWith(3, null, { rows: [ ] });

  // Get doc for parent update
  getDoc.onCall(0).callsArgWith(1, null, {
      _id: 'a',
      contact: { name: 'name', 'phone': 'phone'},
      parent: {_id: 'b', contact: { name: 'name1', 'phone': 'phone1' }}
    });
  // Get parent doc
  getDoc.onCall(1).callsArgWith(1, null, { _id: 'b', contact: {}, newKey: 'newValue' });
  getDoc.onCall(2).callsArgWith(1, null, { _id: 'b', contact: {}, newKey: 'newValue' });
  // Update doc : deleted parent
  insertDoc.onCall(0).callsArgWith(1, null);
  // Update doc : update the parent field
  updatePlace.onCall(0).callsArgWith(2, null);
  // Get doc for contact update
  getDoc.onCall(3).callsArgWith(1, null,
    {
      _id: 'a',
      contact: { name: 'name', 'phone': 'phone'},
      parent: { _id: 'b', contact: {_id: 'f'}}
    });
  // Update doc : deleted contact
  insertDoc.onCall(1).callsArgWith(1, null);
  // Create person doc
  createPerson.onCall(0).callsArgWith(1, null, { id: 'c'});
  // Update doc : reset the contact field
  updatePlace.onCall(1).callsArgWith(2, null);

  migration.run(function(err) {
    test.equals(err, undefined);
    // Called once per place type.
    test.equals(getView.callCount, 3);

    test.equals(getDoc.callCount, 4);
    test.equals(getDoc.firstCall.args[0], 'a');
    test.equals(getDoc.secondCall.args[0], 'b');
    test.equals(getDoc.thirdCall.args[0], 'b');
    test.equals(getDoc.lastCall.args[0], 'a');

    test.equals(insertDoc.callCount, 2);
    test.equals(updatePlace.callCount, 2);
    // Parent was deleted, then reset.
    test.deepEqual(insertDoc.firstCall.args[0],
      {
        _id: 'a',
        contact: { name: 'name', 'phone': 'phone'},
      });
    test.equals(updatePlace.firstCall.args[0], 'a');
    test.deepEqual(updatePlace.firstCall.args[1], { parent: 'b'});

    // Contact was deleted, then reset.
    test.deepEqual(insertDoc.secondCall.args[0],
      {
        _id: 'a',
        parent: { _id: 'b', contact: {_id: 'f'}}
      });
    test.equals(updatePlace.secondCall.args[0], 'a');
    test.deepEqual(updatePlace.secondCall.args[1], { contact: 'c'});
    // Contact created.
    test.equals(createPerson.callCount, 1);
    test.deepEqual(createPerson.firstCall.args[0], {
        name: 'name',
        phone: 'phone',
        place: 'a'
      });

    test.done();
  });
};
