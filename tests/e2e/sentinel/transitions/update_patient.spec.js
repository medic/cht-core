const chai = require('chai');
const utils = require('../../../utils');
const sentinelUtils = require('../utils');
const uuid = require('uuid');

const contacts = [
  {
    _id: 'contact1',
    type: 'person',
    phone: '555 111 222',
    name: 'Contact 1',
    patient_id: '12345'
  },
  {
    _id: 'contact2',
    type: 'person',
    phone: '555 333 444',
    name: 'Contact 2',
  },
];

describe('update_patient', () => {
  beforeAll(done => utils.saveDocs(contacts).then(done));
  afterAll(done => utils.revertDb().then(done));
  afterEach(done => utils.revertDb(contacts.map(c => c._id), true).then(done));

  it('should be skipped when transition is disabled', () => {
    const settings = {
      transitions: { update_patient: false },
      update_patient: { forms: ['the_form'] }
    };

    const doc = {
      _id: uuid(),
      type: 'data_record',
      from: '1234567890',
      form: 'the_form',
    };

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        chai.expect(Object.keys(info.transitions).length).to.equal(0);
      });
  });

  it('should be skipped when not configured form', () => {
    const settings = {
      transitions: { update_patient: true },
      update_patient: { forms: ['the_form'] }
    };

    const doc = {
      _id: uuid(),
      type: 'data_record',
      from: '555 333 444',
      form: 'other_form',
      fields: {},
    };

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        chai.expect(Object.keys(info.transitions).length).to.equal(0);
      });
  });

  it('should be skipped when already has patient_id', () => {
    const settings = {
      transitions: { update_patient: true },
      update_patient: { forms: ['the_form'] }
    };

    const doc = {
      _id: uuid(),
      type: 'data_record',
      from: '555 333 444',
      form: 'the_form',
      fields: {
        patient_id: 'other_patient',
      },
    };

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        chai.expect(Object.keys(info.transitions).length).to.equal(0);
      });
  });

  it('should do nothing when patient is not found', () => {
    const settings = {
      transitions: { update_patient: true },
      update_patient: { forms: ['the_form'] }
    };

    const doc = {
      _id: uuid(),
      type: 'data_record',
      from: 'unknown',
      form: 'the_form',
    };

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        chai.expect(Object.keys(info.transitions).length).to.equal(0);
      });
  });

  it('should not overwrite existent patient _id', () => {
    const settings = {
      transitions: { update_patient: true },
      update_patient: {
        forms: ['form1', 'form2', 'form3']
      }
    };

    const doc = {
      _id: uuid(),
      type: 'data_record',
      from: '555 333 444',
      form: 'form3',
      fields: { patient_id: 'already has patient' },
      reported_date: new Date().getTime()
    };

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        chai.expect(Object.keys(info.transitions).length).to.equal(0);
      });
  });


  it('should set patient in the doc when found', () => {
    const settings = {
      transitions: { update_patient: true },
      update_patient: {
        forms: ['the_form']
      }
    };

    const doc = {
      _id: uuid(),
      type: 'data_record',
      from: '555 111 222',
      form: 'the_form',
      fields: {
        note: 'bla',
      },
      reported_date: new Date().getTime()
    };

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        chai.expect(info.transitions).to.deep.nested.include({ 'update_patient.ok': true });
      })
      .then(() => utils.getDoc(doc._id))
      .then(updated => {
        delete updated._rev;
        chai.expect(updated).to.deep.equal({
          _id: doc._id,
          type: 'data_record',
          from: '555 111 222',
          form: 'the_form',
          fields: {
            note: 'bla',
            patient_uuid: 'contact1',
            patient_id: '12345',
          },
          reported_date: doc.reported_date,
        });
      });
  });

  it('should set patient without patient_id in the doc', () => {
    const settings = {
      transitions: { update_patient: true },
      update_patient: {
        forms: ['form1', 'form2', 'form3']
      }
    };

    const doc = {
      _id: uuid(),
      type: 'data_record',
      from: '555 333 444',
      form: 'form3',
      reported_date: new Date().getTime()
    };

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        chai.expect(info.transitions).to.deep.nested.include({ 'update_patient.ok': true });
      })
      .then(() => utils.getDoc(doc._id))
      .then(updated => {
        delete updated._rev;
        chai.expect(updated).to.deep.equal({
          _id: doc._id,
          type: 'data_record',
          from: '555 333 444',
          form: 'form3',
          fields: {
            patient_uuid: 'contact2',
          },
          reported_date: doc.reported_date,
        });
      });
  });

  it('should provide hydrated patient info for subsequent transitions', () => {
    const settings = {
      transitions: { update_patient: true, accept_patient_reports: true },
      update_patient: {
        forms: ['form']
      },
      patient_reports: [{
        form: 'form',
        messages: [{
          event_type: 'report_accepted',
          recipient: 'patient.phone',
          message: [{
            locale: 'en',
            content: 'got message from {{patient.name}}'
          }],
        }]
      }],
      forms: { form: { public_form: true } },
    };

    const doc = {
      _id: uuid(),
      type: 'data_record',
      from: '555 111 222',
      form: 'form',
      fields: {
        note: 'bla',
      },
      reported_date: new Date().getTime()
    };

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        chai.expect(info.transitions).to.deep.nested.include({ 'update_patient.ok': true });
        chai.expect(info.transitions).to.deep.nested.include({ 'accept_patient_reports.ok': true });
      })
      .then(() => utils.getDoc(doc._id))
      .then(updated => {
        chai.expect(updated).to.deep.include({
          _id: doc._id,
          type: 'data_record',
          from: '555 111 222',
          form: 'form',
          fields: {
            note: 'bla',
            patient_id: '12345',
            patient_uuid: 'contact1',
          },
          reported_date: doc.reported_date,
        });
        chai.expect(updated.tasks.length).to.equal(1);
        chai.expect(updated.tasks[0].messages[0]).to.deep.include({
          to: '555 111 222',
          message: 'got message from Contact 1',
        });
      });
  });
});
