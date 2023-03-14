require('chai').should();
const sinon = require('sinon');
const db = require('../../../src/db');
const utils = require('../../../src/lib/utils');
const config = require('../../../src/config');

describe('death_reporting', () => {
  let transition;

  beforeEach(() => {
    config.init({
      getAll: sinon.stub().returns({}),
      get: sinon.stub(),
    });
    transition = require('../../../src/transitions/death_reporting');
  });

  afterEach(done => {
    sinon.reset();
    sinon.restore();
    done();
  });

  describe('onMatch', () => {
    it('marks a patient deceased with uuid', () => {
      const patientId = 'some-uuid';
      const dateOfDeath = 15612321;
      const patient = { _id: patientId, name: 'greg' };
      const change = {
        doc: {
          reported_date: dateOfDeath,
          form: 'death-confirm',
          fields: { patient_id: patientId },
          patient: patient, // lineage hydrates this patient property
        },
      };
      config.get.returns({
        mark_deceased_forms: ['death-confirm'],
        undo_deceased_forms: ['death-undo'],
        date_field: 'death.date',
      });

      const saveDoc = sinon.stub(db.medic, 'put').resolves({ ok: true });
      const get = sinon.stub(db.medic, 'get').withArgs(patient._id).resolves(patient);
      return transition.onMatch(change).then(changed => {
        changed.should.equal(true);
        get.callCount.should.equal(1);
        get.args[0].should.deep.equal([patientId]);
        saveDoc.callCount.should.equal(1);
        saveDoc.args[0].should.deep.equal([{
          _id: patientId,
          name: 'greg',
          date_of_death: dateOfDeath,
        }]);
      });
    });

    it('marks a patient deceased with shortcode', () => {
      const patientId = '00001';
      const dateOfDeath = 15612321;
      const patient = { name: 'greg', _id: 'greg_uuid', patient_id: patientId };
      const change = {
        doc: {
          reported_date: dateOfDeath,
          form: 'death-confirm',
          fields: { patient_id: patientId },
          patient: patient,
        },
      };
      config.get.returns({
        mark_deceased_forms: ['death-confirm'],
        undo_deceased_forms: ['death-undo'],
        date_field: 'death.date',
      });
      const saveDoc = sinon.stub(db.medic, 'put').resolves({ ok: true });
      sinon.stub(db.medic, 'get').withArgs(patient._id).resolves(patient);
      return transition.onMatch(change).then(changed => {
        changed.should.equal(true);
        db.medic.get.callCount.should.equal(1);
        db.medic.get.args[0].should.deep.equal([patient._id]);
        saveDoc.callCount.should.equal(1);
        saveDoc.args[0].should.deep.equal([{
          name: 'greg',
          _id: 'greg_uuid',
          patient_id: patientId,
          date_of_death: dateOfDeath,
        }]);
      });
    });

    it('does not require patient_id', () => {
      const patientId = '00001';
      const dateOfDeath = 15612321;
      const patient = { name: 'greg', _id: 'greg_uuid', patient_id: patientId };
      const change = {
        doc: {
          reported_date: dateOfDeath,
          form: 'death-confirm',
          fields: { patient_uuid: patient._id },
          patient: patient,
        },
      };
      config.get.returns({
        mark_deceased_forms: ['death-confirm'],
        undo_deceased_forms: ['death-undo'],
        date_field: 'death.date',
      });
      const saveDoc = sinon.stub(db.medic, 'put').resolves({ ok: true });
      sinon.stub(db.medic, 'get').withArgs(patient._id).resolves(patient);
      return transition.onMatch(change).then(changed => {
        changed.should.equal(true);
        db.medic.get.callCount.should.equal(1);
        db.medic.get.args[0].should.deep.equal([patient._id]);
        saveDoc.callCount.should.equal(1);
        saveDoc.args[0].should.deep.equal([{
          name: 'greg',
          _id: 'greg_uuid',
          patient_id: patientId,
          date_of_death: dateOfDeath,
        }]);
      });
    });

    it('uses the configured field for the date', () => {
      const patientId = 'some-uuid';
      const dateOfDeath = 1529285369317;
      const patient = { name: 'greg', _id: patientId };
      const change = {
        doc: {
          reported_date: 15612321,
          form: 'death-confirm',
          fields: {
            patient_id: patientId,
            death: { date: dateOfDeath },
          },
          patient: patient
        },
      };
      config.get.returns({
        mark_deceased_forms: ['death-confirm'],
        undo_deceased_forms: ['death-undo'],
        date_field: 'fields.death.date',
      });
      const saveDoc = sinon.stub(db.medic, 'put').resolves({ ok: true });
      sinon.stub(db.medic, 'get').withArgs(patient._id).resolves(patient);
      return transition.onMatch(change).then(changed => {
        changed.should.equal(true);
        saveDoc.callCount.should.equal(1);
        saveDoc.args[0].should.deep.equal([{
          name: 'greg',
          _id: patientId,
          date_of_death: dateOfDeath,
        }]);
      });
    });

    it('unmarks a patient deceased', () => {
      const patientId = '00001';
      const patient = { name: 'greg', date_of_death: 13151549848, _id: patientId };
      const change = {
        doc: {
          form: 'death-undo',
          fields: { patient_id: patientId },
          patient: patient,
        },
      };
      config.get.returns({
        mark_deceased_forms: ['death-confirm'],
        undo_deceased_forms: ['death-undo'],
      });
      const saveDoc = sinon.stub(db.medic, 'put').resolves({ ok: true });
      sinon.stub(db.medic, 'get').withArgs(patient._id).resolves(patient);
      return transition.onMatch(change).then(changed => {
        changed.should.equal(true);
        saveDoc.callCount.should.equal(1);
        saveDoc.args[0].should.deep.equal([{ name: 'greg', _id: patientId }]);
      });
    });

    it('does nothing if patient in correct state', () => {
      const patientId = '00001';
      const patient = { name: 'greg', date_of_death: 13151549848, _id: patientId };
      const change = {
        doc: {
          form: 'death-confirm',
          fields: { patient_uuid: patientId },
          patient: patient
        },
      };
      config.get.returns({
        mark_deceased_forms: ['death-confirm'],
        undo_deceased_forms: ['death-undo'],
      });
      const saveDoc = sinon.stub(db.medic, 'put').resolves({ ok: true });
      sinon.stub(db.medic, 'get').withArgs(patient._id).resolves(patient);
      return transition.onMatch(change).then(changed => {
        changed.should.equal(false);
        saveDoc.callCount.should.equal(0);
      });
    });

    it('should do nothing if patient somehow is not hydrated or something', () => {
      const patientId = '00001';
      const change = {
        doc: {
          form: 'death-confirm',
          fields: { patient_uuid: patientId },
          patient: { empty: '????' },
        },
      };
      config.get.returns({
        mark_deceased_forms: ['death-confirm'],
        undo_deceased_forms: ['death-undo'],
      });
      sinon.stub(db.medic, 'put');
      sinon.stub(db.medic, 'get');
      return transition.onMatch(change).then(changed => {
        changed.should.equal(false);
        db.medic.get.callCount.should.equal(0);
        db.medic.put.callCount.should.equal(0);
      });
    });
  });

  describe('filter', () => {
    it('empty doc returns false', () => {
      transition.filter({ doc: {} }).should.equal(false);
    });

    it('no type returns false', () => {
      config.get.returns({ mark_deceased_forms: ['x', 'y'] });
      transition.filter({ doc: { form: 'x' } }).should.equal(false);
      transition.filter({ doc: { from: 'x' }}).should.equal(false);
    });

    it('no patient returns false', () => {
      config.get.returns({ mark_deceased_forms: ['x', 'y'] });
      transition.filter({ doc: { form: 'x', type: 'data_record' }}).should.equal(false);
    });

    it('invalid submission returns false', () => {
      config.get.returns({
        mark_deceased_forms: ['x', 'y'],
        undo_deceased_forms: ['z', 't']
      });

      sinon.stub(utils, 'isValidSubmission').returns(false);
      transition
        .filter({
          doc: {
            type: 'data_record',
            form: 'z',
            fields: {},
            patient: {}
          },
          info: {}
        })
        .should.equal(false);
      utils.isValidSubmission.callCount.should.equal(1);
      utils.isValidSubmission.args[0]
        .should.deep.equal([{ type: 'data_record', form: 'z', fields: { }, patient: { } }]);
    });

    it('returns true', () => {
      config.get.returns({
        mark_deceased_forms: ['x', 'y'],
        undo_deceased_forms: ['z', 't']
      });

      sinon.stub(utils, 'isValidSubmission').returns(true);
      transition
        .filter({
          doc: {
            type: 'data_record',
            form: 'z',
            fields: { patient_id: '12' },
            patient: { patient_id: '12' }
          },
          info: {}
        })
        .should.equal(true);
      transition
        .filter({
          doc: {
            type: 'data_record',
            form: 't',
            fields: { patient_id: '12' },
            patient: { patient_id: '12' }
          },
          info: {}
        })
        .should.equal(true);
      utils.isValidSubmission.callCount.should.equal(2);
      utils.isValidSubmission.args[0].should.deep.equal([
        { type: 'data_record', form: 'z', fields: { patient_id: '12' }, patient: { patient_id: '12' } }
      ]);
      utils.isValidSubmission.args[1].should.deep.equal([
        { type: 'data_record', form: 't', fields: { patient_id: '12' }, patient: { patient_id: '12' } }
      ]);
    });
  });
});
