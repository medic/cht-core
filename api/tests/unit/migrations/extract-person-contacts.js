var sinon = require('sinon').sandbox.create(),
    db = require('../../../db'),
    people = require('../../../controllers/people'),
    places = require('../../../controllers/places'),
    migration = require('../../../migrations/extract-person-contacts');

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
  sinon.restore();
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

exports['run attempts to revert the contact on error'] = function(test) {
  test.expect(4);

  // Migrate one type: Get the 3 levels of hierarchy
  getView.onCall(0).callsArgWith(3, null, { rows: [ { id: 'a' }] });
  getView.onCall(1).callsArgWith(3, null, { rows: [ ] });
  getView.onCall(2).callsArgWith(3, null, { rows: [ ] });

  // updateParents: Get doc for parent update
  getDoc.onCall(0).callsArgWith(1, null, {
      _id: 'a',
      contact: { name: 'name', phone: 'phone'},
      parent: {_id: 'b', contact: { name: 'name1', 'phone': 'phone1' }}
    });
  // removeParent : insert place with deleted parent
  insertDoc.onCall(0).callsArg(1);
  // resetParent: get parent to reset
  getDoc.onCall(1).callsArgWith(1, null, { _id: 'b', contact: {}, newKey: 'newValue' });
  // resetParent: update the place
  updatePlace.onCall(0).callsArg(2);

  // Get doc for contact update
  getDoc.onCall(2).callsArgWith(1, null,
    {
      _id: 'a',
      contact: { name: 'name', phone: 'phone'},
      parent: { _id: 'b', contact: {_id: 'f'}}
    });
  // Update doc : deleted contact
  insertDoc.onCall(1).callsArg(1);
  // Create person doc
  createPerson.onCall(0).callsArgWith(1, null, { id: 'c'});
  // Update doc : reset the contact field
  updatePlace.onCall(1).callsArgWith(2, 'error');
  // Restore the parent
  updatePlace.onCall(2).callsArg(2);

  migration.run(function(err) {
    test.equals(err.message, 'Failed to update contact on facility a: "error"');
    test.equals(updatePlace.thirdCall.args[0], 'a');
    test.equals(updatePlace.thirdCall.args[1].contact.name, 'name');
    test.equals(updatePlace.thirdCall.args[1].contact.phone, 'phone');
    test.done();
  });
};
