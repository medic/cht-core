const sinon = require('sinon');
const chai = require('chai');
const db = require('../../../src/db');
const config = require('../../../src/config');
const dataContext = require('../../../src/services/data-context');
const { people, places } = require('@medic/contacts')(config, db, dataContext);
const migration = require('../../../src/migrations/extract-person-contacts');
const { Contact, Qualifier } = require('@medic/cht-datasource');

let createPerson;
let insertDoc;
let updatePlace;
let dataContextBind;
let contactGet;
let contactGetUuids;

describe('extract-person-contacts migration', () => {

  beforeEach(() => {
    insertDoc = sinon.stub(db.medic, 'put');
    updatePlace = sinon.stub(places, 'updatePlace');
    createPerson = sinon.stub(people, 'createPerson');
    
    contactGet = sinon.stub();
    contactGetUuids = sinon.stub();
    dataContextBind = sinon.stub(dataContext, 'bind');
    dataContextBind.withArgs(Contact.v1.get).returns(contactGet);
    dataContextBind.withArgs(Contact.v1.getUuids).returns(contactGetUuids);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('run does nothing if no facilities', () => {
    const emptyGenerator = async function* () {
      // Empty generator - no facilities to process
    };
    
    contactGetUuids.returns(emptyGenerator());
    
    return migration.run().then(() => {
      chai.expect(contactGetUuids.callCount).to.equal(3);
      
      chai.expect(contactGetUuids.getCall(0).args[0]).to.deep.equal(Qualifier.byContactType('district_hospital'));
      chai.expect(contactGetUuids.getCall(1).args[0]).to.deep.equal(Qualifier.byContactType('health_center'));
      chai.expect(contactGetUuids.getCall(2).args[0]).to.deep.equal(Qualifier.byContactType('clinic'));
      
      // No docs should be retrieved since no facilities exist
      chai.expect(contactGet.callCount).to.equal(0);
      // No edits happened.
      chai.expect(insertDoc.callCount).to.equal(0);
      chai.expect(updatePlace.callCount).to.equal(0);
      chai.expect(createPerson.callCount).to.equal(0);
    });
  });

  it('run attempts to revert the contact on error', () => {
    const facilityGenerator = async function* () {
      yield 'a';
    };
    
    const emptyGenerator = async function* () {
    };
    
    // Only district_hospital has facilities, others are empty
    contactGetUuids.onCall(0).returns(facilityGenerator());
    contactGetUuids.onCall(1).returns(emptyGenerator());
    contactGetUuids.onCall(2).returns(emptyGenerator());

    // Mock facility document for updateParents step
    contactGet.onCall(0).resolves({
      _id: 'a',
      contact: { name: 'name', phone: 'phone'},
      parent: {_id: 'b', contact: { name: 'name1', phone: 'phone1' }}
    });
    
    // removeParent: insert place with deleted parent
    insertDoc.onCall(0).callsArgWith(1, null);
    
    // resetParent: get parent to reset
    contactGet.onCall(1).resolves({ 
      _id: 'b', 
      contact: {_id: 'existing-contact'}, 
      newKey: 'newValue' 
    });
    
    // resetParent: update the place - success
    updatePlace.onCall(0).resolves();

    // Mock facility document for createPerson step (after parent update)
    contactGet.onCall(2).resolves({
      _id: 'a',
      contact: { name: 'name', phone: 'phone'}
    });
    
    // removeContact: delete contact from facility
    insertDoc.onCall(1).callsArgWith(1, null);
    
    // createPerson: create person doc - success
    createPerson.onCall(0).resolves({ id: 'c'});
    
    // resetContact: update doc with new contact - FAIL
    updatePlace.onCall(1).returns(Promise.reject('error'));
    
    // restoreContact: restore the original contact - success
    updatePlace.onCall(2).resolves();

    return migration.run().then(() => {
      throw new Error('Migration should have failed');
    }).catch(err => {
      chai.expect(err.message).to.equal('Failed to update contact on facility a: {}');
      
      // Verify restore contact was called
      chai.expect(updatePlace.callCount).to.equal(3);
      chai.expect(updatePlace.thirdCall.args[0]).to.equal('a');
      chai.expect(updatePlace.thirdCall.args[1].contact.name).to.equal('name');
      chai.expect(updatePlace.thirdCall.args[1].contact.phone).to.equal('phone');
    });
  });
});
