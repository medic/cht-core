require('chai').should();
const sinon = require('sinon').sandbox.create(),
      transition = require('../../../transitions/death_reporting'),
      utils = require('../../../lib/utils'),
      config = require('../../../config');

describe('death_reporting', () => {

  afterEach(done => {
    sinon.restore();
    done();
  });

  describe('onMatch', () => {
    it('marks a patient deceased', done => {
      const patientId = '00001';
      const dateOfDeath = 15612321;
      const patient = { name: 'greg' };
      const change = {
        doc: {
          reported_date: dateOfDeath,
          form: 'death-confirm',
          fields: { patient_id: patientId }
        }
      };
      sinon.stub(config, 'get').returns({
        mark_deceased_forms: ['death-confirm'],
        undo_deceased_forms: ['death-undo']
      });
      const getPatientContact = sinon.stub(utils, 'getPatientContact').callsArgWith(2, null, patient);
      const saveDoc = sinon.stub().callsArg(1);
      const db = 'some-db';
      const audit = { saveDoc: saveDoc };
      transition.onMatch(change, db, audit, (err, updated) => {
        updated.should.equal(true);
        getPatientContact.callCount.should.equal(1);
        getPatientContact.args[0][0].should.equal(db);
        getPatientContact.args[0][1].should.equal(patientId);
        saveDoc.callCount.should.equal(1);
        saveDoc.args[0][0].should.deep.equal({ name: 'greg', date_of_death: dateOfDeath });
        done();
      });
    });

    it('unmarks a patient deceased', done => {
      const patientId = '00001';
      const patient = { name: 'greg', date_of_death: 13151549848 };
      const change = {
        doc: {
          form: 'death-undo',
          fields: { patient_id: patientId }
        }
      };
      sinon.stub(config, 'get').returns({
        mark_deceased_forms: ['death-confirm'],
        undo_deceased_forms: ['death-undo']
      });
      const getPatientContact = sinon.stub(utils, 'getPatientContact').callsArgWith(2, null, patient);
      const saveDoc = sinon.stub().callsArg(1);
      const db = 'some-db';
      const audit = { saveDoc: saveDoc };
      transition.onMatch(change, db, audit, (err, updated) => {
        updated.should.equal(true);
        getPatientContact.callCount.should.equal(1);
        getPatientContact.args[0][0].should.equal(db);
        getPatientContact.args[0][1].should.equal(patientId);
        saveDoc.callCount.should.equal(1);
        saveDoc.args[0][0].should.deep.equal({ name: 'greg' });
        done();
      });
    });

    it('does nothing if patient in correct state', done => {
      const patientId = '00001';
      const patient = { name: 'greg', date_of_death: 13151549848 };
      const change = {
        doc: {
          form: 'death-confirm',
          fields: { patient_id: patientId }
        }
      };
      sinon.stub(config, 'get').returns({
        mark_deceased_forms: ['death-confirm'],
        undo_deceased_forms: ['death-undo']
      });
      const getPatientContact = sinon.stub(utils, 'getPatientContact').callsArgWith(2, null, patient);
      const saveDoc = sinon.stub().callsArg(1);
      const db = 'some-db';
      const audit = { saveDoc: saveDoc };
      transition.onMatch(change, db, audit, (err, updated) => {
        updated.should.equal(false);
        getPatientContact.callCount.should.equal(1);
        getPatientContact.args[0][0].should.equal(db);
        getPatientContact.args[0][1].should.equal(patientId);
        saveDoc.callCount.should.equal(0);
        done();
      });
    });
  });

});
