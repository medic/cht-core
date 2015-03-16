var sinon = require('sinon'),
    db = require('../../db'),
    migration = require('../../migrations/extract-person-contacts');

exports.tearDown = function (callback) {
  if (db.medic.view.restore) {
    db.medic.view.restore();
  }
  if (db.medic.get.restore) {
    db.medic.get.restore();
  }
  if (db.medic.insert.restore) {
    db.medic.insert.restore();
  }
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

  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: [ { id: 'a' }, { id: 'b' }, { id: 'c' } ] });
  
  var getDoc = sinon.stub(db.medic, 'get');
  getDoc.onFirstCall().callsArgWith(1, null, { id: 'a', contact: { name: 'alfred adamson', phone: 'a' } });
  getDoc.onSecondCall().callsArgWith(1, null, { id: 'b', contact: { _id: 'd', name: 'boris botham', phone: 'b' } });
  getDoc.onThirdCall().callsArgWith(1, null, { id: 'c', contact: { name: 'chris cairns', phone: 'c' } });
  
  var saveDoc = sinon.stub(db.medic, 'insert');
  // saving the first new contact
  saveDoc.onCall(0).callsArgWith(1, null, { id: 'e', rev: '1' });
  // updating the facility with the new contact
  saveDoc.onCall(1).callsArgWith(1, null, { id: 'a', rev: '2' });
  // saving the second new contact
  saveDoc.onCall(2).callsArgWith(1, null, { id: 'f', rev: '1' });
  // updating the facility with the new contact
  saveDoc.onCall(3).callsArgWith(1, null, { id: 'c', rev: '2' });

  migration.run(function(err) {
    test.equals(err, undefined);
    test.equals(getView.callCount, 1);
    test.equals(getDoc.callCount, 3);
    test.equals(getDoc.firstCall.args[0], 'a');
    test.equals(getDoc.secondCall.args[0], 'b');
    test.equals(getDoc.thirdCall.args[0], 'c');
    test.deepEqual(saveDoc.args[0][0], { type: 'person', name: 'alfred adamson', phone: 'a' });
    test.deepEqual(saveDoc.args[1][0].contact, { _id: 'e', _rev: '1', name: 'alfred adamson', phone: 'a', type: 'person' });
    test.deepEqual(saveDoc.args[2][0], { type: 'person', name: 'chris cairns', phone: 'c' });
    test.deepEqual(saveDoc.args[3][0].contact, { _id: 'f', _rev: '1', name: 'chris cairns', phone: 'c', type: 'person' });
    test.done();
  });
};
