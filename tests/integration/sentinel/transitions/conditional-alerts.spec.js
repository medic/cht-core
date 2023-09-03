const utils = require('@utils');
const sentinelUtils = require('@utils/sentinel');
const uuid = require('uuid').v4;
const { expect } = require('chai');

const contacts = [
  {
    _id: 'district_hospital',
    name: 'District hospital',
    type: 'district_hospital',
    reported_date: new Date().getTime()
  },
  {
    _id: 'health_center',
    name: 'Health Center',
    type: 'health_center',
    parent: { _id: 'district_hospital' },
    reported_date: new Date().getTime()
  },
  {
    _id: 'clinic',
    name: 'Clinic',
    type: 'clinic',
    parent: { _id: 'health_center', parent: { _id: 'district_hospital' } },
    contact: {
      _id: 'person',
      parent: { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
    },
    reported_date: new Date().getTime()
  },
  {
    _id: 'person',
    name: 'Person',
    type: 'person',
    parent: { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } },
    phone: '+444999',
    reported_date: new Date().getTime()
  }
];

describe('conditional_alerts', () => {
  before(() => utils.saveDocs(contacts));
  after(() => utils.revertDb([], true));
  afterEach(() => utils.revertDb(contacts.map(c => c._id), true));

  it('should be skipped when transition is disabled', () => {
    const settings = {
      transitions: { conditional_alerts: false },
      alerts: [
        {
          form: 'FORM',
          condition: true,
          message: 'This is an alert',
          recipient: 'reporting_unit'
        }
      ],
      forms: { FORM: { } }
    };

    const doc = {
      _id: uuid(),
      form: 'FORM',
      type: 'data_record',
      reported_date: new Date().getTime(),
      from: '+444999',
      contact: {
        _id: 'person',
        parent: { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
      }
    };

    return utils
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        expect(Object.keys(info.transitions)).to.be.empty;
      });
  });

  it('should be skipped when no matching config', () => {
    const settings = {
      transitions: { conditional_alerts: true },
      alerts: [{
        form: 'FORM',
        condition: true,
        message: 'This is an alert',
        recipient: 'reporting_unit'
      }],
      forms: { O: { } }
    };

    const doc = {
      _id: uuid(),
      form: 'O',
      type: 'data_record',
      reported_date: new Date().getTime(),
      from: '+444999',
      contact: {
        _id: 'person',
        parent: { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
      }
    };

    return utils
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        expect(Object.keys(info.transitions)).to.be.empty;
      });
  });

  it('should be skipped when conditions are not met', () => {
    const settings = {
      transitions: { conditional_alerts: true },
      alerts: [{
        form: 'FORM',
        condition: 'FORM(0).somefield > 100',
        message: 'This is an alert',
        recipient: 'reporting_unit'
      }],
      forms: { FORM: { } }
    };

    const doc = {
      _id: uuid(),
      form: 'FORM',
      type: 'data_record',
      reported_date: new Date().getTime(),
      from: '+444999',
      contact: {
        _id: 'person',
        parent: {
          _id: 'clinic',
          parent: { _id: 'health_center', parent: { _id: 'district_hospital' } }
        }
      },
      somefield: 99
    };

    return utils
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        expect(Object.keys(info.transitions)).to.be.empty;
      });
  });

  it('should add a task when conditions are met', () => {
    const settings = {
      transitions: { conditional_alerts: true },
      alerts: [{
        form: 'FORM',
        condition: 'FORM(0).somefield > 100',
        message: 'This is an alert',
        recipient: 'reporting_unit'
      }],
      forms: { FORM: { } }
    };

    const doc = {
      _id: uuid(),
      form: 'FORM',
      type: 'data_record',
      reported_date: new Date().getTime(),
      from: '+444999',
      contact: {
        _id: 'person',
        parent: { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
      },
      somefield: 120
    };

    return utils
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        expect(info.transitions.conditional_alerts.ok).to.be.true;
        return utils.getDoc(doc._id);
      })
      .then(updated => {
        expect(updated.tasks).to.have.lengthOf(1);
        expect(updated.tasks[0].messages[0].to).to.equal(doc.from);
        expect(updated.tasks[0].messages[0].message).to.equal('This is an alert');
        expect(updated.tasks[0].state).to.equal('pending');
      });
  });

  it('should add a task when condition is met and depends on multiple forms', () => {
    const settings = {
      transitions: { conditional_alerts: true },
      alerts: [{
        form: 'FORM',
        condition: 'FORM(1) && FORM(0).temp > FORM(1).temp && ' +
                   '1000 < FORM(0).reported_date - FORM(1).reported_date < 10000',
        message: 'Fever increased since the last measurement',
        recipient: 'reporting_unit'
      }, {
        form: 'FORM',
        condition: 'FORM(0).temp > 37 && (!FORM(1) || FORM(0).reported_date - FORM(1).reported_date > 10000)',
        message: 'Patient has a fever',
        recipient: 'reporting_unit'
      }],
      forms: { FORM: { } }
    };

    const form1 = {
      _id: uuid(),
      form: 'FORM',
      type: 'data_record',
      reported_date: new Date().getTime() - 1200,
      from: '+444999',
      contact: {
        _id: 'person',
        parent: { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
      },
      temp: 38
    };

    const form0 = {
      _id: uuid(),
      form: 'FORM',
      type: 'data_record',
      reported_date: new Date().getTime(),
      from: '+444999',
      contact: {
        _id: 'person',
        parent: { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
      },
      temp: 39
    };

    return utils
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDoc(form1))
      .then(() => sentinelUtils.waitForSentinel(form1._id))
      .then(() => sentinelUtils.getInfoDoc(form1._id))
      .then(info => {
        expect(info.transitions.conditional_alerts.ok).to.be.true;
        return utils.getDoc(form1._id);
      })
      .then(updated => {
        expect(updated.tasks).to.have.lengthOf(1);
        expect(updated.tasks[0].messages[0].to).to.equal(form1.from);
        expect(updated.tasks[0].messages[0].message).to.equal('Patient has a fever');
        expect(updated.tasks[0].state).to.equal('pending');
      })
      .then(() => utils.saveDoc(form0))
      .then(() => sentinelUtils.waitForSentinel(form0._id))
      .then(() => sentinelUtils.getInfoDoc(form0._id))
      .then(info => {
        expect(info.transitions.conditional_alerts.ok).to.be.true;
        return utils.getDoc(form0._id);
      })
      .then(updated => {
        expect(updated.tasks).to.have.lengthOf(1);
        expect(updated.tasks[0].messages[0].to).to.equal(form0.from);
        expect(updated.tasks[0].messages[0].message).to.equal('Fever increased since the last measurement');
        expect(updated.tasks[0].state).to.equal('pending');
      });
  });
});
