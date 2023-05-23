const chai = require('chai');
const utils = require('@utils');
const sentinelUtils = require('@utils/sentinel');
const uuid = require('uuid').v4;

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

const translations = {
  'messages.generic.sender_not_found': 'Sender not found'
};

describe('self_report', () => {
  before(() => utils.saveDocs(contacts).then(() => utils.addTranslations('test', translations)));
  after(() => utils.revertDb([], true));
  afterEach(() => utils.revertDb(contacts.map(c => c._id), true));

  it('should be skipped when transition is disabled', () => {
    const settings = {
      transitions: { self_report: false },
      self_report: [{ form: 'the_form' }],
    };

    const doc = {
      _id: uuid(),
      type: 'data_record',
      from: '1234567890',
      form: 'the_form',
    };

    return utils
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        chai.expect(Object.keys(info.transitions)).to.be.empty;
      });
  });

  it('should be skipped when not configured form', () => {
    const settings = {
      transitions: { self_report: true },
      self_report: [{ form: 'the_form' }],
    };

    const doc = {
      _id: uuid(),
      type: 'data_record',
      from: '555 333 444',
      form: 'other_form',
      fields: {},
    };

    return utils
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        chai.expect(Object.keys(info.transitions)).to.be.empty;
      });
  });

  it('should be skipped when already has patient_id', () => {
    const settings = {
      transitions: { self_report: true },
      self_report: [{ form: 'the_form' }],
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
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        chai.expect(Object.keys(info.transitions)).to.be.empty;
      });
  });

  it('should add error when patient is not found', () => {
    const settings = {
      transitions: { self_report: true },
      self_report: [{ form: 'the_form' }],
    };

    const doc = {
      _id: uuid(),
      type: 'data_record',
      from: 'unknown',
      form: 'the_form',
      locale: 'test',
    };

    return utils
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        chai.expect(info.transitions).to.deep.nested.include({ 'self_report.ok': true });
      })
      .then(() => utils.getDoc(doc._id))
      .then(updated => {
        chai.expect(updated).to.have.all.keys('_id', '_rev', 'type', 'from', 'form', 'errors', 'tasks', 'locale');
        chai.expect(updated).to.include({
          _id: doc._id,
          type: 'data_record',
          from: 'unknown',
          form: 'the_form',
        });
        chai.expect(updated.errors).to.deep.equal([{
          message: 'Sender not found',
          code: 'sender_not_found',
        }]);
        chai.expect(updated.tasks).to.have.lengthOf(1);
        chai.expect(updated.tasks[0].messages[0]).to.include({
          to: 'unknown',
          message: 'Sender not found'
        });
      });
  });

  it('should add configured error SMS when sender not found', () => {
    const settings = {
      transitions: { self_report: true },
      self_report: [{
        form: 'the_form',
        messages: [{
          event_type: 'sender_not_found',
          recipient: 'reporting_unit',
          message: [{ content: 'Not registered' }],
        }]
      }],
    };

    const doc = {
      _id: uuid(),
      type: 'data_record',
      from: 'unknown',
      form: 'the_form',
    };

    return utils
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        chai.expect(info.transitions).to.deep.nested.include({ 'self_report.ok': true });
      })
      .then(() => utils.getDoc(doc._id))
      .then(updated => {
        chai.expect(updated).to.include({
          type: 'data_record',
          from: 'unknown',
          form: 'the_form',
        });
        chai.expect(updated.errors).to.deep.equal([{ message: 'Not registered', code: 'sender_not_found' }]);
        chai.expect(updated.tasks).to.have.lengthOf(1);
        chai.expect(updated.tasks[0].messages[0]).to.include({
          to: 'unknown',
          message: 'Not registered',
        });
      });
  });

  it('should not overwrite existent patient _id', () => {
    const settings = {
      transitions: { self_report: true },
      self_report: [{ form: 'form1' }, { form: 'form2' }, { form: 'form3' }],
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
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        chai.expect(Object.keys(info.transitions)).to.be.empty;
      });
  });


  it('should set patient in the doc when found', () => {
    const settings = {
      transitions: { self_report: true },
      self_report: [{ form: 'the_form' }],
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
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        chai.expect(info.transitions).to.deep.nested.include({ 'self_report.ok': true });
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
      transitions: { self_report: true },
      self_report: [{ form: 'form1' }, { form: 'form2' }, { form: 'form3' }],
    };

    const doc = {
      _id: uuid(),
      type: 'data_record',
      from: '555 333 444',
      form: 'form3',
      reported_date: new Date().getTime()
    };

    return utils
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        chai.expect(info.transitions).to.deep.nested.include({ 'self_report.ok': true });
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
      transitions: { self_report: true, accept_patient_reports: true },
      self_report: [{ form: 'form' }],
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
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        chai.expect(info.transitions).to.deep.nested.include({ 'self_report.ok': true });
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
        chai.expect(updated.tasks).to.have.lengthOf(1);
        chai.expect(updated.tasks[0].messages[0]).to.deep.include({
          to: '555 111 222',
          message: 'got message from Contact 1',
        });
      });
  });

  it('should add message when patient not found and configured', () => {
    const settings = {
      transitions: { self_report: true },
      self_report: [{
        form: 'form3',
        messages: [{
          event_type: 'report_accepted',
          recipient: 'reporting_unit',
          message: [{ content: 'Registered {{from}} {{patient.name}}' }],
        }, {
          event_type: 'sender_not_found',
          recipient: 'reporting_unit',
          message: [{ content: 'not found' }],
        }]
      }, {
        form: 'form2',
        messages: [{
          event_type: 'report_accepted',
          recipient: 'reporting_unit',
          message: [{ content: 'Registered' }],
        }]
      }],
    };

    const doc = {
      _id: uuid(),
      type: 'data_record',
      from: '555 333 444',
      form: 'form3',
      reported_date: new Date().getTime()
    };

    return utils
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        chai.expect(info.transitions).to.deep.nested.include({ 'self_report.ok': true });
      })
      .then(() => utils.getDoc(doc._id))
      .then(updated => {
        chai.expect(updated).to.include({
          type: 'data_record',
          from: '555 333 444',
          form: 'form3',
        });
        chai.expect(updated.errors).be.undefined;
        chai.expect(updated.tasks).to.have.lengthOf(1);
        chai.expect(updated.tasks[0].messages[0]).to.include({
          to: '555 333 444',
          message: 'Registered 555 333 444 Contact 2',
        });
      });
  });
});
