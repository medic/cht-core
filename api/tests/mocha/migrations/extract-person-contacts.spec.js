const sinon = require('sinon'),
      chai = require('chai'),
      db = require('../../../src/db-nano'),
      people = require('../../../src/controllers/people'),
      places = require('../../../src/controllers/places'),
      migration = require('../../../src/migrations/extract-person-contacts');

let createPerson,
    getDoc,
    getView,
    insertDoc,
    updatePlace;

describe('extract-person-contacts migration', () => {

  beforeEach(() => {
    getView = sinon.stub(db.medic, 'view');
    getDoc = sinon.stub(db.medic, 'get');
    insertDoc = sinon.stub(db.medic, 'insert');
    updatePlace = sinon.stub(places, 'updatePlace');
    createPerson = sinon.stub(people, 'createPerson');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('run does nothing if no facilities', done => {
    getView.callsArgWith(3, null, { rows: [] });
    getDoc.callsArgWith(1, null, {  });
    migration.run(err => {
      // Called once per place type.
      chai.expect(getView.callCount).to.equal(3);
      chai.expect(getDoc.callCount).to.equal(0);
      // No edits happened.
      chai.expect(insertDoc.callCount).to.equal(0);
      chai.expect(updatePlace.callCount).to.equal(0);
      chai.expect(createPerson.callCount).to.equal(0);
      done(err);
    });
  });

  it('run attempts to revert the contact on error', done => {
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
    updatePlace.onCall(0).resolves();

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
    createPerson.onCall(0).resolves({ id: 'c'});
    // Update doc : reset the contact field
    updatePlace.onCall(1).returns(Promise.reject('error'));
    // Restore the parent
    updatePlace.onCall(2).resolves();

    migration.run(err => {
      chai.expect(err.message).to.equal('Failed to update contact on facility a: "error"');
      chai.expect(updatePlace.thirdCall.args[0]).to.equal('a');
      chai.expect(updatePlace.thirdCall.args[1].contact.name).to.equal('name');
      chai.expect(updatePlace.thirdCall.args[1].contact.phone).to.equal('phone');
      done();
    });
  });
});
