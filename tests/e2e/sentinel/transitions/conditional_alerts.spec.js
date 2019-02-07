const utils = require('../../../utils'),
      querystring = require('querystring'),
      uuid = require('uuid');

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
    contact: { _id: 'person', parent:  { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } } },
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

const DOCS_TO_KEEP = [
  'district_hospital',
  'health_center',
  'clinic',
  'person'
];

const waitForSentinel = docId => {
  return utils
    .requestOnSentinelTestDb('/_local/sentinel-meta-data')
    .then(metaData => metaData.processed_seq)
    .then(seq => {
      const changeOpts = {
        since: seq,
        filter: '_doc_ids',
        doc_ids: JSON.stringify([docId])
      };
      return utils.requestOnTestDb('/_changes?' + querystring.stringify(changeOpts));
    })
    .then(response => {
      if (response.results && !response.results.length) {
        // sentinel has caught up and processed our doc
        return;
      }

      return new Promise(resolve => {
        setTimeout(() => waitForSentinel(docId).then(resolve), 100);
      });
    });
};

const getInfoDoc = docId => {
  return utils.requestOnSentinelTestDb('/' + docId + '-info');
};

describe('conditional_alerts', () => {
  beforeAll(done => utils.saveDocs(contacts).then(done));
  afterAll(done => utils.revertDb().then(done));
  afterEach(done => utils.revertDb(DOCS_TO_KEEP, true).then(done));

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
      ]
    };

    const doc = {
      _id: uuid(),
      form: 'FORM',
      type: 'data_record',
      reported_date: new Date().getTime(),
      from: '+444999'
    };

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDoc(doc))
      .then(() => waitForSentinel(doc._id))
      .then(() => getInfoDoc(doc._id))
      .then(info => {
        expect(info.transitions).toEqual(undefined);
      });
  });

  it('should be skipped when enabled but have no matching config', () => {
    const settings = {
      transitions: { conditional_alerts: true },
      alerts: [{
        form: 'FORM',
        condition: true,
        message: 'This is an alert',
        recipient: 'reporting_unit'
      }]
    };

    const doc = {
      _id: uuid(),
      form: 'O',
      type: 'data_record',
      reported_date: new Date().getTime(),
      from: '+444999'
    };

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDoc(doc))
      .then(() => waitForSentinel(doc._id))
      .then(() => getInfoDoc(doc._id))
      .then(info => {
        expect(info.transitions).toEqual(undefined);
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
      }]
    };

    const doc = {
      _id: uuid(),
      form: 'FORM',
      type: 'data_record',
      reported_date: new Date().getTime(),
      from: '+444999',
      contact: { _id: 'person', parent:  { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } } },
      somefield: 99
    };

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDoc(doc))
      .then(() => waitForSentinel(doc._id))
      .then(() => getInfoDoc(doc._id))
      .then(info => {
        expect(info.transitions).toEqual(undefined);
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
      }]
    };

    const doc = {
      _id: uuid(),
      form: 'FORM',
      type: 'data_record',
      reported_date: new Date().getTime(),
      from: '+444999',
      contact: { _id: 'person', parent:  { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } } },
      somefield: 120
    };

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDoc(doc))
      .then(() => waitForSentinel(doc._id))
      .then(() => getInfoDoc(doc._id))
      .then(info => {
        expect(info.transitions).toBeDefined();
        expect(info.transitions.conditional_alerts).toBeDefined();
        expect(info.transitions.conditional_alerts.ok).toBe(true);
        return utils.getDoc(doc._id);
      })
      .then(updated => {
        expect(updated.tasks).toBeDefined();
        expect(updated.tasks.length).toEqual(1);
        expect(updated.tasks[0].messages[0].to).toEqual(doc.from);
        expect(updated.tasks[0].messages[0].message).toEqual('This is an alert');
      });
  });

  it('should add a task when condition is met and depends on multiple forms', () => {
    const settings = {
      transitions: { conditional_alerts: true },
      alerts: [{
        form: 'FORM',
        condition: 'FORM(1) && FORM(0).temp > FORM(1).temp && 1000 < FORM(0).reported_date - FORM(1).reported_date < 10000',
        message: 'Fever increased since the last measurement',
        recipient: 'reporting_unit'
      }, {
        form: 'FORM',
        condition: 'FORM(0).temp > 37 && (!FORM(1) || FORM(0).reported_date - FORM(1).reported_date > 10000)',
        message: 'Patient has a fever',
        recipient: 'reporting_unit'
      }]
    };

    const form1 = {
      _id: uuid(),
      form: 'FORM',
      type: 'data_record',
      reported_date: new Date().getTime() - 1200,
      from: '+444999',
      contact: { _id: 'person', parent:  { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } } },
      temp: 38
    };

    const form0 = {
      _id: uuid(),
      form: 'FORM',
      type: 'data_record',
      reported_date: new Date().getTime(),
      from: '+444999',
      contact: { _id: 'person', parent:  { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } } },
      temp: 39
    };

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDoc(form1))
      .then(() => waitForSentinel(form1._id))
      .then(() => getInfoDoc(form1._id))
      .then(info => {
        expect(info.transitions).toBeDefined();
        expect(info.transitions.conditional_alerts).toBeDefined();
        expect(info.transitions.conditional_alerts.ok).toBe(true);
        return utils.getDoc(form1._id);
      })
      .then(updated => {
        expect(updated.tasks).toBeDefined();
        expect(updated.tasks.length).toEqual(1);
        expect(updated.tasks[0].messages[0].to).toEqual(form1.from);
        expect(updated.tasks[0].messages[0].message).toEqual('Patient has a fever');
      })
      .then(() => utils.saveDoc(form0))
      .then(() => waitForSentinel(form0._id))
      .then(() => getInfoDoc(form0._id))
      .then(info => {
        expect(info.transitions).toBeDefined();
        expect(info.transitions.conditional_alerts).toBeDefined();
        expect(info.transitions.conditional_alerts.ok).toBe(true);
        return utils.getDoc(form0._id);
      })
      .then(updated => {
        expect(updated.tasks).toBeDefined();
        expect(updated.tasks.length).toEqual(1);
        expect(updated.tasks[0].messages[0].to).toEqual(form0.from);
        expect(updated.tasks[0].messages[0].message).toEqual('Fever increased since the last measurement');
      });
  });
});
