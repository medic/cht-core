require('chai').should();
const sinon = require('sinon'),
  db = require('../../../src/db-pouch'),
  transition = require('../../../src/transitions/death_reporting'),
  utils = require('../../../src/lib/utils'),
  config = require('../../../src/config');

describe('death_reporting', () => {
  afterEach(done => {
    sinon.restore();
    done();
  });

  describe('onMatch', () => {
    it('marks a patient deceased with uuid', done => {
      const patientId = 'some-uuid';
      const dateOfDeath = 15612321;
      const patient = { name: 'greg' };
      const change = {
        doc: {
          reported_date: dateOfDeath,
          form: 'death-confirm',
          fields: { patient_id: patientId },
        },
      };
      sinon.stub(config, 'get').returns({
        mark_deceased_forms: ['death-confirm'],
        undo_deceased_forms: ['death-undo'],
        date_field: 'death.date',
      });
      const getPatientContact = sinon
        .stub(utils, 'getPatientContact')
        .callsArgWith(2, null, patient);
      const saveDoc = sinon.stub(db.medic, 'put').callsArg(1);
      const get = sinon.stub(db.medic, 'get').callsArgWith(1, null, patient);
      transition.onMatch(change).then(changed => {
        changed.should.equal(true);
        get.callCount.should.equal(1);
        get.args[0][0].should.equal(patientId);
        getPatientContact.callCount.should.equal(0);
        saveDoc.callCount.should.equal(1);
        saveDoc.args[0][0].should.deep.equal({
          name: 'greg',
          date_of_death: dateOfDeath,
        });
        done();
      });
    });

    it('marks a patient deceased with shortcode', done => {
      const patientId = '00001';
      const dateOfDeath = 15612321;
      const patient = { name: 'greg' };
      const change = {
        doc: {
          reported_date: dateOfDeath,
          form: 'death-confirm',
          fields: { patient_id: patientId },
        },
      };
      sinon.stub(config, 'get').returns({
        mark_deceased_forms: ['death-confirm'],
        undo_deceased_forms: ['death-undo'],
        date_field: 'death.date',
      });
      const getPatientContact = sinon
        .stub(utils, 'getPatientContact')
        .callsArgWith(2, null, patient);
      const saveDoc = sinon.stub(db.medic, 'put').callsArg(1);
      sinon.stub(db.medic, 'get').callsArgWith(1, { statusCode: 404 });
      transition.onMatch(change).then(changed => {
        changed.should.equal(true);
        getPatientContact.callCount.should.equal(1);
        getPatientContact.args[0][0].should.equal(db);
        getPatientContact.args[0][1].should.equal(patientId);
        saveDoc.callCount.should.equal(1);
        saveDoc.args[0][0].should.deep.equal({
          name: 'greg',
          date_of_death: dateOfDeath,
        });
        done();
      });
    });

    it('uses the configured field for the date', () => {
      const patientId = 'some-uuid';
      const dateOfDeath = 1529285369317;
      const patient = { name: 'greg' };
      const change = {
        doc: {
          reported_date: 15612321,
          form: 'death-confirm',
          fields: {
            patient_id: patientId,
            death: { date: dateOfDeath },
          },
        },
      };
      sinon.stub(config, 'get').returns({
        mark_deceased_forms: ['death-confirm'],
        undo_deceased_forms: ['death-undo'],
        date_field: 'fields.death.date',
      });
      sinon.stub(utils, 'getPatientContact').callsArgWith(2, null, patient);
      const saveDoc = sinon.stub(db.medic, 'put').callsArg(1);
      sinon.stub(db.medic, 'get').callsArgWith(1, null, patient);
      return transition.onMatch(change).then(changed => {
        changed.should.equal(true);
        saveDoc.callCount.should.equal(1);
        saveDoc.args[0][0].should.deep.equal({
          name: 'greg',
          date_of_death: dateOfDeath,
        });
      });
    });

    it('unmarks a patient deceased', done => {
      const patientId = '00001';
      const patient = { name: 'greg', date_of_death: 13151549848 };
      const change = {
        doc: {
          form: 'death-undo',
          fields: { patient_id: patientId },
        },
      };
      sinon.stub(config, 'get').returns({
        mark_deceased_forms: ['death-confirm'],
        undo_deceased_forms: ['death-undo'],
      });
      const getPatientContact = sinon
        .stub(utils, 'getPatientContact')
        .callsArgWith(2, null, patient);
      const saveDoc = sinon.stub(db.medic, 'put').callsArg(1);
      sinon.stub(db.medic, 'get').callsArgWith(1, { statusCode: 404 });
      transition.onMatch(change).then(changed => {
        changed.should.equal(true);
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
          fields: { patient_id: patientId },
        },
      };
      sinon.stub(config, 'get').returns({
        mark_deceased_forms: ['death-confirm'],
        undo_deceased_forms: ['death-undo'],
      });
      const getPatientContact = sinon
        .stub(utils, 'getPatientContact')
        .callsArgWith(2, null, patient);
      const saveDoc = sinon.stub(db.medic, 'put').callsArg(1);
      sinon.stub(db.medic, 'get').callsArgWith(1, { statusCode: 404 });
      transition.onMatch(change).then(changed => {
        changed.should.equal(false);
        getPatientContact.callCount.should.equal(1);
        getPatientContact.args[0][0].should.equal(db);
        getPatientContact.args[0][1].should.equal(patientId);
        saveDoc.callCount.should.equal(0);
        done();
      });
    });

    it('does nothing if patient not found', done => {
      const patientId = '00001';
      const change = {
        doc: {
          form: 'death-confirm',
          fields: { patient_id: patientId },
        },
      };
      sinon.stub(config, 'get').returns({
        mark_deceased_forms: ['death-confirm'],
        undo_deceased_forms: ['death-undo'],
      });
      const getPatientContact = sinon
        .stub(utils, 'getPatientContact')
        .callsArgWith(2);
      const saveDoc = sinon.stub(db.medic, 'put').callsArg(1);
      const get = sinon
        .stub(db.medic, 'get')
        .callsArgWith(1, { statusCode: 404 });
      transition.onMatch(change).then(changed => {
        (!!changed).should.equal(false);
        get.callCount.should.equal(1);
        getPatientContact.callCount.should.equal(1);
        saveDoc.callCount.should.equal(0);
        done();
      });
    });
  });
});
