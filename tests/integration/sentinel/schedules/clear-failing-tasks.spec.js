const utils = require('@utils');
const sentinelUtils = require('@utils/sentinel');
const chai = require('chai');
const moment = require('moment');

const reportedDate = moment().valueOf();
const oneMonthAgo = moment().subtract(1, 'month').toISOString();
const threeDaysAgo = moment().subtract(3, 'days').toISOString();
const twoDaysAgo = moment().subtract(2, 'days').toISOString();

const contacts = [
  {
    _id: 'district_hospital',
    name: 'District',
    type: 'contact',
    contact_type: 'district_hospital',
    reported_date: reportedDate,
  },
  {
    _id: 'health_center',
    name: 'Health Center',
    type: 'contact',
    contact_type: 'health_center',
    parent: { _id: 'district_hospital' },
    contact: { _id: 'supervisor1', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } },
    reported_date: reportedDate,
  },  
  {
    _id: 'clinic1',
    name: 'clinic1',
    type: 'contact',
    contact_type: 'clinic',
    place_id: 'the_clinic',
    parent: { _id: 'health_center', parent: { _id: 'district_hospital' } },
    contact: {
      _id: 'chw1',
      parent: { _id: 'clinic1', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
    },
    reported_date: reportedDate,
  },
  {
    _id: 'chw1',
    name: 'Chw1',
    type: 'contact',
    contact_type: 'person',
    parent: { _id: 'clinic1', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } },
    phone: '111222',
    reported_date: reportedDate,
  },
  {
    _id: 'patient_1',
    patient_id: 'patient1',
    name: 'Patient1',
    type: 'contact',
    contact_type: 'person',
    parent: { _id: 'clinic1', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } },
    reported_date: reportedDate,
  }
];

const reports = [  
  {
    _id: 'report1',
    type: 'data_record',
    contact: {
      _id: 'chw1',
      parent: { _id: 'clinic1', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
    },
    fields: { patient_id: '', value: 2, patient_uuid: 'patient_1' },
    reported_date: oneMonthAgo,
    scheduled_tasks: [
      {
        due: twoDaysAgo,
        message_key: 'messages.one',
        recipient: 'clinic',
        state_history: [],
        state: 'scheduled',
      },      
      {
        due: threeDaysAgo, // task with missing translation key
        message_key: 'non.exisiting.key',
        recipient: 'clinic',
        state_history: [],
        state: 'scheduled',
      },
    ],
  },
];

const settings = {
  locales: [{ code: 'test', name: 'test language' }],
  locale_outgoing: 'test',
  schedule_evening_minutes: 59,
  sms: {
    clear_failing_schedules: true
  }
};

const translations = {
  'messages.one':
    'ONE. Reported by {{contact.name}}. Patient {{patient_name}} ({{patient_id}}). Value {{fields.value}}',
};

const ids = reports.map(report => report._id);

describe('Due Tasks', () => {
  before(() => utils
    .saveDocs(contacts)
    .then(() => utils.addTranslations('test', translations))
    .then(() => utils.updateSettings(settings, { ignoreReload: 'sentinel' })));
  after(() => utils.revertDb([], true));

  it('should process scheduled messages correctly as expected with clear_failing_schedules to true.', async () => {
    await sentinelUtils.waitForSentinel();
    await utils.toggleSentinelTransitions();
    await utils.saveDocs(reports);
    await utils.toggleSentinelTransitions();
    await utils.runSentinelTasks();
    await sentinelUtils.waitForSentinel(ids);

    await utils.waitForDocRev([     
      { id: 'report1', rev: 2 }
    ]);

    const [ report1 ] = await utils.getDocs(ids);

    chai.expect(report1).to.deep.nested.include({
      _id: 'report1',
      'scheduled_tasks[0].state': 'pending',      
      'scheduled_tasks[1].state': 'clear',
    });
    chai.expect(report1.scheduled_tasks[0].messages[0]).to.include({
      message: 'ONE. Reported by Chw1. Patient Patient1 (patient1). Value 2',
      to: '111222'
    });
    chai.expect(report1.scheduled_tasks[1].messages).to.equal(undefined);
  });
});
