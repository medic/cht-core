const rewire = require('rewire');
const sinon = require('sinon');
const chai = require('chai');
const config = require('../../../src/config');
const db = require('../../../src/db');
const transition = rewire('../../../src/transitions/update_patient');

let lineage;
let revertLineage;

describe('update_patient transition', () => {
  beforeEach(() => {
    lineage = { fetchHydratedDoc: sinon.stub() };
    revertLineage = transition.__set__('lineage', lineage);
    sinon.stub(db.medic, 'query');
  });
  afterEach(() => {
    revertLineage();
    sinon.restore();
  });

  describe('filter', () => {
    it('should not crash when no doc, no info and generally bad input', () => {
      chai.expect(transition.filter()).to.equal(false);
      chai.expect(transition.filter(false)).to.equal(false);
      chai.expect(transition.filter([])).to.equal(false);
      chai.expect(transition.filter({}, false)).to.equal(false);
      chai.expect(transition.filter({ form: '' }, {})).to.equal(false);
    });

    it('should return false when doc is not valid', () => {
      sinon.stub(config, 'get').returns({ forms: ['configured_form', 'configured_form2'] });

      const noFrom = { type: 'data_record', form: 'configured_form' };
      chai.expect(transition.filter(noFrom)).to.equal(false);

      const notDataRecord = { type: 'contact', from: 'someone', form: 'configured_form' };
      chai.expect(transition.filter(notDataRecord)).to.equal(false);

      const notConfiguredForm = { type: 'data_record', from: 'someone', form: 'other_form' };
      chai.expect(transition.filter(notConfiguredForm)).to.equal(false);

      const alreadyHasPatientId = {
        type: 'data_record',
        from: 'a',
        form: 'configured_form',
        fields: { patient_id: '12345'},
      };
      chai.expect(transition.filter(alreadyHasPatientId)).to.equal(false);

      const alreadyHasPatientUuid = {
        type: 'data_record',
        from: 'a',
        form: 'configured_form',
        fields: { patient_uuid: '12345' },
      };
      chai.expect(transition.filter(alreadyHasPatientUuid)).to.equal(false);

      const transitionAlreadyRan = { type: 'data_record', from: 'a', form: 'configured_form2' };
      const info = { transitions: { update_patient: { success: true } } };
      chai.expect(transition.filter(transitionAlreadyRan, info)).to.equal(false);
    });

    it('should return true when it is a valid doc', () => {
      sinon.stub(config, 'get').returns({ forms: ['form1', 'form2'] });

      const form1 = { type: 'data_record', from: 'alpha', form: 'form1' };
      const info = { transitions: {}};
      chai.expect(transition.filter(form1, info)).to.equal(true);

      const form2 = { type: 'data_record', from: 'alpha', form: 'form2' };
      info.transitions.some_transition = {};
      chai.expect(transition.filter(form2, info)).to.equal(true);

      chai.expect(config.get.callCount).to.equal(2);
      chai.expect(config.get.args[0]).to.deep.equal(['update_patient']);
      chai.expect(config.get.args[1]).to.deep.equal(['update_patient']);
    });
  });

  describe('onMatch', () => {
    it('should search for the sender and do nothing when sender not found', () => {
      db.medic.query.resolves({ rows: [] });
      const doc = { from: '12345' };
      return transition.onMatch({ doc }).then(result => {
        chai.assert(!result);
        chai.expect(db.medic.query.callCount).to.equal(1);
        chai.expect(db.medic.query.args[0]).to.deep.equal([
          'medic-client/contacts_by_phone',
          { key: '12345' }
        ]);
        chai.expect(lineage.fetchHydratedDoc.callCount).to.equal(0);
        chai.expect(doc).to.have.all.keys('from'); // no changes to the doc
      });
    });

    it('should hydrate patient and attach it to the doc', () => {
      const doc = { from: '654987' };
      const patient = {
        _id: 'the_contact',
        name: 'Martin',
        parent: { name: 'Albert' },
        phone: '654987',
        patient_id: 'martin_id'
      };

      db.medic.query.resolves({ rows: [{ id: 'the_contact' }] });
      lineage.fetchHydratedDoc.resolves(patient);

      return transition.onMatch({ doc }).then(result => {
        chai.expect(result).to.equal(true);
        chai.expect(db.medic.query.callCount).to.equal(1);
        chai.expect(db.medic.query.args[0]).to.deep.equal([
          'medic-client/contacts_by_phone',
          { key: '654987' }
        ]);
        chai.expect(lineage.fetchHydratedDoc.callCount).to.equal(1);
        chai.expect(lineage.fetchHydratedDoc.args[0]).to.deep.equal(['the_contact']);
        chai.expect(doc).to.have.all.keys('from', 'patient', 'fields');
        chai.expect(doc.patient).to.deep.equal(patient);
        chai.expect(doc.fields).to.deep.equal({ patient_id: 'martin_id', patient_uuid: 'the_contact' });
      });
    });

    it('should throw db errors', () => {
      const doc = { from: 'aaa' };
      db.medic.query.rejects({ some: 'err' });
      return transition
        .onMatch({ doc })
        .then(() => chai.assert.fail('Should have thrown'))
        .catch(err => {
          chai.expect(err).to.deep.equal({ some: 'err' });
          chai.expect(lineage.fetchHydratedDoc.callCount).to.equal(0);
          chai.expect(doc).to.have.all.keys('from'); // no changes to the doc
        });
    });

    it('should throw lineage errors', () => {
      const doc = { from: '654987' };
      db.medic.query.resolves({ rows: [{ id: 'the_contact' }] });
      lineage.fetchHydratedDoc.rejects({ other: 'err' });

      return transition
        .onMatch({ doc })
        .then(() => chai.assert.fail('Should have thrown'))
        .catch(err => {
          chai.expect(err).to.deep.equal({ other: 'err' });
          chai.expect(db.medic.query.callCount).to.equal(1);
          chai.expect(lineage.fetchHydratedDoc.callCount).to.equal(1);
          chai.expect(doc).to.have.all.keys('from'); // no changes to the doc
        });
    });

    it('should preserve other fields', () => {
      const doc = {
        type: 'data_record',
        from: '111222333',
        fields: {
          note: 'some note',
        }
      };
      const patient = {
        _id: 'contact_uuid',
        name: 'Stanford',
        phone: '111222333',
        parent: { name: 'Albert' },
        patient_id: 'stan'
      };

      db.medic.query.resolves({ rows: [{ id: 'contact_uuid' }] });
      lineage.fetchHydratedDoc.resolves(patient);

      return transition.onMatch({ doc }).then(result => {
        chai.expect(result).to.equal(true);
        chai.expect(db.medic.query.callCount).to.equal(1);
        chai.expect(db.medic.query.args[0]).to.deep.equal([
          'medic-client/contacts_by_phone',
          { key: '111222333' }
        ]);
        chai.expect(lineage.fetchHydratedDoc.callCount).to.equal(1);
        chai.expect(lineage.fetchHydratedDoc.args[0]).to.deep.equal(['contact_uuid']);
        chai.expect(doc).to.deep.equal({
          type: 'data_record',
          from: '111222333',
          fields: {
            note: 'some note',
            patient_id: 'stan',
            patient_uuid: 'contact_uuid'
          },
          patient: patient,
        });
      });
    });

    it('should pick the first result when multiple found', () => {
      const doc = { type: 'data_record', from: '98765'};
      const patient = {
        _id: 'contact_uuid',
        name: 'Stanford',
        phone: '98765',
        parent: { name: 'Albert' },
        patient_id: 'stan'
      };

      db.medic.query.resolves({ rows: [{ id: 'contact1' }, { id: 'contact2' }] });
      lineage.fetchHydratedDoc.resolves(patient);

      return transition.onMatch({ doc }).then(result => {
        chai.expect(result).to.equal(true);
        chai.expect(db.medic.query.callCount).to.equal(1);
        chai.expect(db.medic.query.args[0]).to.deep.equal([ 'medic-client/contacts_by_phone', { key: '98765' } ]);
        chai.expect(lineage.fetchHydratedDoc.callCount).to.equal(1);
        chai.expect(lineage.fetchHydratedDoc.args[0]).to.deep.equal(['contact1']);
        chai.expect(doc).to.deep.equal({
          type: 'data_record',
          from: '98765',
          fields: {
            patient_id: 'stan',
            patient_uuid: 'contact_uuid'
          },
          patient: patient,
        });
      });
    });
  });
});
