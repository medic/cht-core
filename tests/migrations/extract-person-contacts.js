var sinon = require('sinon'),
    db = require('../../db'),
    utils = require('../utils'),
    migration = require('../../migrations/extract-person-contacts');

exports.tearDown = function (callback) {
  utils.restore(db.medic.view, db.medic.get, db.medic.insert);
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
  test.expect(10);
  var places = [
    { _id: 'a', contact: { name: 'alfred adamson', phone: 'a123' } },
    // Already migrated
    { _id: 'b', contact: { _id: 'd', name: 'boris botham', phone: 'b123' } },
    { _id: 'c', contact: { name: 'chris cairns', phone: 'c123' } }
  ];
  var placeIds = places.map(function(place) { return place._id; });
  var contactIds = places.map(function(place) { return 'contact' + place._id; });

  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: [
    { id: placeIds[0] }, { id: placeIds[1] }, { id: placeIds[2] }] });

  var getDoc = sinon.stub(db.medic, 'get');
  getDoc.onFirstCall().callsArgWith(1, null, places[0]);
  getDoc.onSecondCall().callsArgWith(1, null, places[1]);
  getDoc.onThirdCall().callsArgWith(1, null, places[2]);

  var saveDoc = sinon.stub(db.medic, 'insert');
  // saving the first new contact
  saveDoc.onCall(0).callsArgWith(1, null, { id: contactIds[0], rev: '1' });
  // updating the facility with the new contact
  saveDoc.onCall(1).callsArgWith(1, null, { id: placeIds[0], rev: '2' });
  // saving the second new contact
  saveDoc.onCall(2).callsArgWith(1, null, { id: contactIds[2], rev: '1' });
  // updating the facility with the new contact
  saveDoc.onCall(3).callsArgWith(1, null, { id: placeIds[2], rev: '2' });

  migration.run(function(err) {
    test.equals(err, undefined);
    test.equals(getView.callCount, 1);
    test.equals(getDoc.callCount, 3);
    test.equals(getDoc.firstCall.args[0], placeIds[0]);
    test.equals(getDoc.secondCall.args[0], placeIds[1]);
    test.equals(getDoc.thirdCall.args[0], placeIds[2]);
    test.deepEqual(saveDoc.args[0][0], { type: 'person', name: places[0].contact.name, phone: places[0].contact.phone, parent: places[0] });
    test.deepEqual(saveDoc.args[1][0].contact, { _id: contactIds[0], _rev: '1', name: places[0].contact.name, phone: places[0].contact.phone, type: 'person' });
    test.deepEqual(saveDoc.args[2][0], { type: 'person', name: places[2].contact.name, phone: places[2].contact.phone, parent: places[2] });
    test.deepEqual(saveDoc.args[3][0].contact, { _id: contactIds[2], _rev: '1', name: places[2].contact.name, phone: places[2].contact.phone, type: 'person' });
    test.done();
  });
};
