const rewire = require('rewire');
const sinon = require('sinon');
const chai = require('chai');
const config = require('../../../src/config');
const db = require('../../../src/db');

let transition;
let lineage;
let revertLineage;

describe('self_report transition', () => {
  beforeEach(() => {
    config.init({
      getAll: sinon.stub().returns({}),
      get: sinon.stub(),
      getTranslations: sinon.stub()
    });
    transition = rewire('../../../src/transitions/self_report');
    lineage = { fetchHydratedDoc: sinon.stub() };
    revertLineage = transition.__set__('lineage', lineage);
    sinon.stub(db.medic, 'query');
  });

  afterEach(() => {
    revertLineage();
    sinon.reset();
    sinon.restore();
  });

  describe('filter', () => {
    it('should not crash when no doc, no info and generally bad input', () => {
      chai.expect(transition.filter({})).to.equal(false);
      chai.expect(transition.filter({ doc: false })).to.equal(false);
      chai.expect(transition.filter({ doc: [] })).to.equal(false);
      chai.expect(transition.filter({ doc: {}, info: false })).to.equal(false);
      chai.expect(transition.filter({ doc: { form: '' }, info: {} })).to.equal(false);
    });

    it('should return false when doc is not valid', () => {
      config.get.returns([
        { form: 'configured_form' },
        { form: 'configured_form2' },
      ]);

      const noFrom = { type: 'data_record', form: 'configured_form' };
      chai.expect(transition.filter({ doc: noFrom })).to.equal(false);

      const notDataRecord = { type: 'contact', from: 'someone', form: 'configured_form' };
      chai.expect(transition.filter({ doc: notDataRecord })).to.equal(false);

      const notConfiguredForm = { type: 'data_record', from: 'someone', form: 'other_form' };
      chai.expect(transition.filter({ doc: notConfiguredForm })).to.equal(false);

      const alreadyHasPatientId = {
        type: 'data_record',
        from: 'a',
        form: 'configured_form',
        fields: { patient_id: '12345'},
      };
      chai.expect(transition.filter({ doc: alreadyHasPatientId })).to.equal(false);

      const alreadyHasPatientUuid = {
        type: 'data_record',
        from: 'a',
        form: 'configured_form',
        fields: { patient_uuid: '12345' },
      };
      chai.expect(transition.filter({ doc: alreadyHasPatientUuid })).to.equal(false);

      const transitionAlreadyRan = { type: 'data_record', from: 'a', form: 'configured_form2' };
      const info = { transitions: { self_report: { success: true } } };
      chai.expect(transition.filter({ doc: transitionAlreadyRan, info })).to.equal(false);
    });

    it('should return true when it is a valid doc', () => {
      config.get.returns([
        { form: 'form1' },
        { form: 'form2' },
      ]);

      const form1 = { type: 'data_record', from: 'alpha', form: 'form1' };
      const info = { transitions: {}};
      chai.expect(transition.filter({ doc: form1, info })).to.equal(true);

      const form2 = { type: 'data_record', from: 'alpha', form: 'form2' };
      info.transitions.some_transition = {};
      chai.expect(transition.filter({ doc: form2, info })).to.equal(true);

      chai.expect(config.get.callCount).to.equal(2);
      chai.expect(config.get.args[0]).to.deep.equal(['self_report']);
      chai.expect(config.get.args[1]).to.deep.equal(['self_report']);
    });
  });

  describe('onMatch', () => {
    it('should search for the sender and add error when sender not found', () => {
      config.get.returns([{ form: 'the_form' }]);
      config.getTranslations.returns({ en: { 'messages.generic.sender_not_found': 'Sender not found' }});
      db.medic.query.resolves({ rows: [] });
      const doc = { from: '12345', form: 'the_form' };
      return transition.onMatch({ doc }).then(result => {
        chai.expect(result).to.equal(true);
        chai.expect(db.medic.query.callCount).to.equal(1);
        chai.expect(db.medic.query.args[0]).to.deep.equal([
          'medic-client/contacts_by_phone',
          { key: '12345' }
        ]);
        chai.expect(lineage.fetchHydratedDoc.callCount).to.equal(0);
        chai.expect(doc).to.have.all.keys('from', 'errors', 'form', 'tasks');
        chai.expect(doc.errors).to.deep.equal([
          { message: 'Sender not found', code: 'sender_not_found' }
        ]);
        chai.expect(doc.tasks.length).to.equal(1);
        chai.expect(doc.tasks[0].messages[0]).to.include({
          to: '12345',
          message: 'Sender not found'
        });
      });
    });

    it('should add task if a message is configured and sender not found', () => {
      config.get.returns([ {
        form: 'the_form',
        messages: [
          {
            event_type: 'sender_not_found',
            recipient: 'reporting_unit',
            translation_key: 'the_message',
          }
        ],
      }, {
        form: 'not_the_form',
        messages: [
          {
            event_type: 'sender_not_found',
            recipient: 'reporting_unit',
            translation_key: 'other_message',
          }
        ],
      } ]);
      config.getTranslations.returns({ en: { the_message: 'translated message' }});

      db.medic.query.resolves({rows: []});
      const doc = { from: '12345', form: 'the_form'};
      return transition.onMatch({doc})
        .then(result => {
          chai.expect(result).to.equal(true);
          chai.expect(db.medic.query.callCount).to.equal(1);
          chai.expect(db.medic.query.args[0]).to.deep.equal([ 'medic-client/contacts_by_phone', { key: '12345' } ]);
          chai.expect(lineage.fetchHydratedDoc.callCount).to.equal(0);
          chai.expect(doc).to.have.all.keys('from', 'errors', 'form', 'tasks');
          chai.expect(doc.errors).to.deep.equal([ {message: 'translated message', code: 'sender_not_found'} ]);
          chai.expect(doc.tasks.length).to.equal(1);
          chai.expect(doc.tasks[0].messages[0]).to.include({ to: '12345', message: 'translated message' });
        });
    });

    it('should hydrate patient and attach it to the doc', () => {
      config.get.returns([ { form: 'the_form' } ]);
      const doc = { from: '654987', form: 'the_form' };
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
        chai.expect(doc).to.have.all.keys('from', 'patient', 'fields', 'form');
        chai.expect(doc.patient).to.deep.equal(patient);
        chai.expect(doc.fields).to.deep.equal({ patient_id: 'martin_id', patient_uuid: 'the_contact' });
      });
    });

    it('should add success message if configured', () => {
      config.get.returns([ {
        form: 'the_form',
        messages: [
          {
            event_type: 'report_accepted',
            recipient: 'reporting_unit',
            translation_key: 'success_message',
          }
        ],
      }, {
        form: 'the_other_form',
        messages: [
          {
            event_type: 'report_accepted',
            recipient: 'reporting_unit',
            translation_key: 'not_success_message',
          }
        ],
      } ]);
      config.getTranslations.returns({ en: { success_message: 'Victory!' }});

      const doc = { from: '999999', form: 'the_form' };
      const patient = {
        _id: 'the_contact',
        name: 'Martin',
        parent: { name: 'Albert' },
        phone: '999999',
        patient_id: 'martin_id'
      };

      db.medic.query.resolves({ rows: [{ id: 'the_contact' }] });
      lineage.fetchHydratedDoc.resolves(patient);

      return transition.onMatch({ doc }).then(result => {
        chai.expect(result).to.equal(true);
        chai.expect(db.medic.query.callCount).to.equal(1);
        chai.expect(db.medic.query.args[0]).to.deep.equal([
          'medic-client/contacts_by_phone',
          { key: '999999' }
        ]);
        chai.expect(lineage.fetchHydratedDoc.callCount).to.equal(1);
        chai.expect(lineage.fetchHydratedDoc.args[0]).to.deep.equal(['the_contact']);
        chai.expect(doc).to.have.all.keys('from', 'patient', 'fields', 'tasks', 'form');
        chai.expect(doc.patient).to.deep.equal(patient);
        chai.expect(doc.fields).to.deep.equal({ patient_id: 'martin_id', patient_uuid: 'the_contact' });
        chai.expect(doc.tasks.length).to.equal(1);
        chai.expect(doc.tasks[0].messages[0]).to.include({ to: '999999', message: 'Victory!' });
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
      config.get.returns([ { form: 'my_form' } ]);
      const doc = {
        type: 'data_record',
        from: '111222333',
        form: 'my_form',
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
          form: 'my_form',
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
      config.get.returns([ { form: 'a_form' } ]);
      const doc = { type: 'data_record', from: '98765', form: 'a_form' };
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
          form: 'a_form',
          fields: {
            patient_id: 'stan',
            patient_uuid: 'contact_uuid'
          },
          patient: patient,
        });
      });
    });

    it('should add success messages depending on sms locale', () => {
      config.get.returns([ {
        form: 'the_form',
        messages: [
          {
            event_type: 'report_accepted',
            recipient: 'reporting_unit',
            translation_key: 'success_message',
          }
        ],
      }, {
        form: 'the_other_form',
        messages: [
          {
            event_type: 'report_accepted',
            recipient: 'reporting_unit',
            translation_key: 'not_success_message',
          }
        ],
      } ]);
      config.getTranslations.returns({
        en: { success_message: 'Victory!' },
        sw: { success_message: 'Bunnies!' },
      });

      const doc = { from: '999999', form: 'the_form', locale: 'sw' };
      const patient = {
        _id: 'the_contact',
        name: 'Martin',
        parent: { name: 'Albert' },
        phone: '999999',
        patient_id: 'martin_id'
      };

      db.medic.query.resolves({ rows: [{ id: 'the_contact' }] });
      lineage.fetchHydratedDoc.resolves(patient);

      return transition.onMatch({ doc }).then(result => {
        chai.expect(result).to.equal(true);
        chai.expect(db.medic.query.callCount).to.equal(1);
        chai.expect(db.medic.query.args[0]).to.deep.equal([
          'medic-client/contacts_by_phone',
          { key: '999999' }
        ]);
        chai.expect(lineage.fetchHydratedDoc.callCount).to.equal(1);
        chai.expect(lineage.fetchHydratedDoc.args[0]).to.deep.equal(['the_contact']);
        chai.expect(doc).to.have.all.keys('from', 'patient', 'fields', 'tasks', 'form', 'locale');
        chai.expect(doc.patient).to.deep.equal(patient);
        chai.expect(doc.fields).to.deep.equal({ patient_id: 'martin_id', patient_uuid: 'the_contact' });
        chai.expect(doc.tasks.length).to.equal(1);
        chai.expect(doc.tasks[0].messages[0]).to.include({ to: '999999', message: 'Bunnies!' });
      });
    });

    it('should add task if a message is configured and sender not found', () => {
      config.get.returns([ {
        form: 'the_form',
        messages: [
          {
            event_type: 'sender_not_found',
            recipient: 'reporting_unit',
            translation_key: 'the_message',
          }
        ],
      }, {
        form: 'not_the_form',
        messages: [
          {
            event_type: 'sender_not_found',
            recipient: 'reporting_unit',
            translation_key: 'other_message',
          }
        ],
      } ]);
      config.getTranslations.returns({
        sw: { the_message: 'not english', other_message: 'msg' },
      });

      db.medic.query.resolves({rows: []});
      const doc = { from: '12345', form: 'the_form', sms_message: { locale: 'sw' }};
      return transition.onMatch({doc})
        .then(result => {
          chai.expect(result).to.equal(true);
          chai.expect(db.medic.query.callCount).to.equal(1);
          chai.expect(db.medic.query.args[0]).to.deep.equal([ 'medic-client/contacts_by_phone', { key: '12345' } ]);
          chai.expect(lineage.fetchHydratedDoc.callCount).to.equal(0);
          chai.expect(doc.tasks.length).to.equal(1);
          chai.expect(doc.tasks[0].messages[0]).to.include({ to: '12345', message: 'not english' });
        });
    });
  });
});

