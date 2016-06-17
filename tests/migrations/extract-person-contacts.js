var sinon = require('sinon'),
    db = require('../../db'),
    people = require('../../controllers/people'),
    places = require('../../controllers/places'),
    utils = require('../utils'),
    migration = require('../../migrations/extract-person-contacts');

exports.tearDown = function (callback) {
  utils.restore(db.medic.view, db.medic.get, db.medic.insert, people.createPerson, places.updatePlace);
  callback();
};

exports['run does nothing if no facilities'] = function(test) {
  test.expect(2);
  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: [] });
  migration.run(function(err) {
    test.equals(err, undefined);
    test.equals(getView.callCount, 1);
    test.done();
  });
};

exports['run does nothing if facilities have no contact'] = function(test) {
  test.expect(4);
  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: [ { id: 'a' } ] });
  var getDoc = sinon.stub(db.medic, 'get').callsArgWith(1, null, {  });
  migration.run(function(err) {
    test.equals(err, undefined);
    test.equals(getView.callCount, 1);
    test.equals(getDoc.callCount, 1);
    test.equals(getDoc.firstCall.args[0], 'a');
    test.done();
  });
};

exports['run does nothing if facilities have been migrated'] = function(test) {
  test.expect(4);
  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: [ { id: 'a' } ] });
  var getDoc = sinon.stub(db.medic, 'get').callsArgWith(1, null, { contact: { _id: 'b' } });
  migration.run(function(err) {
    test.equals(err, undefined);
    test.equals(getView.callCount, 1);
    test.equals(getDoc.callCount, 1);
    test.equals(getDoc.firstCall.args[0], 'a');
    test.done();
  });
};

exports['run saves a person doc and updates the facility'] = function(test) {
  test.expect(12);
  var placesList = [
    { _id: 'a', contact: { name: 'alfred adamson', phone: 'a123' } },
    // Already migrated
    { _id: 'b', contact: { _id: 'd', name: 'boris botham', phone: 'b123' } },
    { _id: 'c', contact: { name: 'chris cairns', phone: 'c123' } }
  ];
  var placeIds = placesList.map(function(place) { return place._id; });
  var contactIds = placesList.map(function(place) { return 'contact' + place._id; });

  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: [
    { id: placeIds[0] }, { id: placeIds[1] }, { id: placeIds[2] }] });

  // Getting each place doc for migration
  var getDoc = sinon.stub(db.medic, 'get');
  getDoc.onFirstCall().callsArgWith(1, null, placesList[0]);
  getDoc.onSecondCall().callsArgWith(1, null, placesList[1]);
  getDoc.onThirdCall().callsArgWith(1, null, placesList[2]);

  var createPerson = sinon.stub(people, 'createPerson');
  var updatePlace = sinon.stub(places, 'updatePlace');
  // saving the first new contact
  createPerson.onCall(0).callsArgWith(1, null, { id: contactIds[0], rev: '1' });
  // updating the facility with the new contact
  updatePlace.onCall(0).callsArgWith(2, null, { id: placeIds[0], rev: '2' });
  // saving the second new contact
  createPerson.onCall(1).callsArgWith(1, null, { id: contactIds[2], rev: '1' });
  // updating the facility with the new contact
  updatePlace.onCall(1).callsArgWith(2, null, { id: placeIds[2], rev: '2' });

  migration.run(function(err) {
    test.equals(err, undefined);
    test.equals(getView.callCount, 1);
    test.equals(getDoc.callCount, 3);
    test.equals(getDoc.firstCall.args[0], placeIds[0]);
    test.equals(getDoc.secondCall.args[0], placeIds[1]);
    test.equals(getDoc.thirdCall.args[0], placeIds[2]);
    test.deepEqual(createPerson.args[0][0], { name: placesList[0].contact.name, phone: placesList[0].contact.phone, place: placesList[0]._id });
    test.deepEqual(createPerson.args[1][0], { name: placesList[2].contact.name, phone: placesList[2].contact.phone, place: placesList[2]._id });
    test.deepEqual(updatePlace.args[0][0], placeIds[0]);
    test.deepEqual(updatePlace.args[0][1], { contact: contactIds[0] });
    test.deepEqual(updatePlace.args[1][0], placeIds[2]);
    test.deepEqual(updatePlace.args[1][1], { contact: contactIds[2] });
    test.done();
  });
};
