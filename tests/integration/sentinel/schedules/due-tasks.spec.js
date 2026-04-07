const utils = require('@utils');
const sentinelUtils = require('@utils/sentinel');
const chai = require('chai');
const moment = require('moment');
const { CONTACT_TYPES } = require('@medic/constants');

const reportedDate = moment().valueOf();
const oneMonthAgo = moment().subtract(1, 'month').toISOString();
const threeDaysAgo = moment().subtract(3, 'days').toISOString();
const twoDaysAgo = moment().subtract(2, 'days').toISOString();
const nearFuture = moment().add(2, 'days').toISOString();

const contacts = [
  {
    _id: 'district_hospital',
    name: 'District',
    type: 'contact',
    contact_type: 'district_hospital',
    reported_date: reportedDate,
  },
  {
    _id: CONTACT_TYPES.HEALTH_CENTER,
    name: 'Health Center',
    type: 'contact',
    contact_type: CONTACT_TYPES.HEALTH_CENTER,
    parent: { _id: 'district_hospital' },
    contact: { _id: 'supervisor1', parent: { _id: CONTACT_TYPES.HEALTH_CENTER, parent: { _id: 'district_hospital' } } },
    reported_date: reportedDate,
  },
  {
    _id: 'supervisor1',
    name: 'Sup1',
    type: 'contact',
    contact_type: 'person',
    parent: { _id: CONTACT_TYPES.HEALTH_CENTER, parent: { _id: 'district_hospital' } },
    phone: '555666',
    reported_date: reportedDate,
  },
  {
    _id: 'clinic1',
    name: 'clinic1',
    type: 'contact',
    contact_type: 'clinic',
    place_id: 'the_clinic',
    parent: { _id: CONTACT_TYPES.HEALTH_CENTER, parent: { _id: 'district_hospital' } },
    contact: {
      _id: 'chw1',
      parent: { _id: 'clinic1', parent: { _id: CONTACT_TYPES.HEALTH_CENTER, parent: { _id: 'district_hospital' } } }
    },
    reported_date: reportedDate,
  },
  {
    _id: 'clinic2',
    name: 'clinic2',
    type: 'contact',
    contact_type: 'clinic',
    place_id: 'the_clinic2',
    parent: { _id: CONTACT_TYPES.HEALTH_CENTER, parent: { _id: 'district_hospital' } },
    contact: {
      _id: 'chw2',
      parent: { _id: 'clinic2', parent: { _id: CONTACT_TYPES.HEALTH_CENTER, parent: { _id: 'district_hospital' } } }
    },
    reported_date: reportedDate,
  },
  {
    _id: 'chw1',
    name: 'Chw1',
    type: 'contact',
    contact_type: 'person',
    parent: { _id: 'clinic1', parent: { _id: CONTACT_TYPES.HEALTH_CENTER, parent: { _id: 'district_hospital' } } },
    phone: '111222',
    reported_date: reportedDate,
  },
  {
    _id: 'chw2',
    name: 'Chw2',
    type: 'contact',
    contact_type: 'person',
    parent: { _id: 'clinic2', parent: { _id: CONTACT_TYPES.HEALTH_CENTER, parent: { _id: 'district_hospital' } } },
    phone: '222333',
    reported_date: reportedDate,
  },
  {
    _id: 'patient_1',
    patient_id: 'patient1',
    name: 'Patient1',
    type: 'contact',
    contact_type: 'person',
    parent: { _id: 'clinic1', parent: { _id: CONTACT_TYPES.HEALTH_CENTER, parent: { _id: 'district_hospital' } } },
    reported_date: reportedDate,
  },
  {
    _id: 'patient_2',
    patient_id: 'patient2',
    name: 'Patient2',
    type: 'contact',
    contact_type: 'person',
    parent: { _id: 'clinic2', parent: { _id: CONTACT_TYPES.HEALTH_CENTER, parent: { _id: 'district_hospital' } } },
    reported_date: reportedDate,
  },
];

const reportWithDuplicateDueDate = {
  _id: 'report_duplicate_due',
  type: 'data_record',
  contact: {
    _id: 'chw1',
    parent: { _id: 'clinic1', parent: { _id: CONTACT_TYPES.HEALTH_CENTER, parent: { _id: 'district_hospital' } } }
  },
  fields: { patient_id: 'patient1', value: 5 },
  reported_date: oneMonthAgo,
  scheduled_tasks: [
    {
      // Task A: already sent, same due date as Task B
      due: twoDaysAgo,
      message_key: 'messages.one',
      recipient: 'clinic',
      state_history: [
        { state: 'scheduled', timestamp: oneMonthAgo },
        { state: 'pending', timestamp: threeDaysAgo },
        { state: 'sent', timestamp: threeDaysAgo },
      ],
      state: 'sent',
      messages: [
        {
          to: '111222',
          uuid: 'uuid-already-sent',
          message: 'ONE. Reported by Chw1. Patient Patient1 (patient1). Value 5',
        },
      ],
    },
    {
      // Task B: stuck in scheduled, same due date as Task A, missing translation
      due: twoDaysAgo,
      message_key: 'non.exisiting.key',
      recipient: 'clinic',
      state_history: [
        { state: 'scheduled', timestamp: oneMonthAgo },
      ],
      state: 'scheduled',
    },
  ],
};

const reports = [
  {
    _id: 'report1', // no tasks
    type: 'data_record',
    contact: {
      _id: 'chw1',
      parent: { _id: 'clinic1', parent: { _id: CONTACT_TYPES.HEALTH_CENTER, parent: { _id: 'district_hospital' } } }
    },
    fields: { patient_id: 'patient1', value: 1 },
    reported_date: oneMonthAgo
  },
  {
    _id: 'report2',
    type: 'data_record',
    contact: {
      _id: 'chw1',
      parent: { _id: 'clinic1', parent: { _id: CONTACT_TYPES.HEALTH_CENTER, parent: { _id: 'district_hospital' } } }
    },
    fields: { patient_id: 'patient1', value: 2 },
    reported_date: oneMonthAgo,
    scheduled_tasks: [
      {
        due: oneMonthAgo, // too old
        message_key: 'messages.one',
        recipient: 'clinic',
        state_history: [],
        state: 'scheduled',
      },
      {
        due: nearFuture, // future
        message_key: 'messages.two',
        recipient: 'clinic',
        state_history: [],
        state: 'scheduled',
      },
      {
        due: twoDaysAgo, // non-scheduled state
        message_key: 'messages.two',
        recipient: 'clinic',
        state_history: [],
        state: 'other_than_scheduled',
      },
    ],
  },
  {
    _id: 'report3',
    type: 'data_record',
    contact: {
      _id: 'chw1',
      parent: { _id: 'clinic1', parent: { _id: CONTACT_TYPES.HEALTH_CENTER, parent: { _id: 'district_hospital' } } }
    },
    fields: { patient_id: 'patient1', value: 2 },
    reported_date: oneMonthAgo,
    scheduled_tasks: [
      {
        due: oneMonthAgo, // too old
        message_key: 'messages.one',
        recipient: 'clinic',
        state_history: [],
        state: 'scheduled',
      },
      {
        due: nearFuture, // future
        message_key: 'messages.two',
        recipient: 'clinic',
        state_history: [],
        state: 'scheduled',
      },
      {
        due: threeDaysAgo, // non-scheduled state
        message_key: 'messages.one',
        recipient: 'clinic',
        state_history: [],
        state: 'sent',
      },
      {
        due: twoDaysAgo, // task to be "pending"
        message_key: 'messages.one',
        recipient: 'ancestor:health_center',
        state_history: [],
        state: 'scheduled',
      },
    ],
  },
  {
    _id: 'report4',
    type: 'data_record',
    contact: {
      _id: 'chw1',
      parent: { _id: 'clinic1', parent: { _id: CONTACT_TYPES.HEALTH_CENTER, parent: { _id: 'district_hospital' } } }
    },
    fields: { patient_id: 'patient2', value: 2 },
    reported_date: oneMonthAgo,
    scheduled_tasks: [
      {
        due: twoDaysAgo, // task with translation sent to "clinic"
        message_key: 'messages.one',
        recipient: 'clinic',
        state_history: [],
        state: 'scheduled',
      },
      {
        due: threeDaysAgo, // task with translation sent to "sender"
        message_key: 'messages.two',
        recipient: 'reporting_unit',
        state_history: [],
        state: 'scheduled',
      },
      {
        due: threeDaysAgo, // task with text
        message: [{
          content: 'THREE. Reported by {{contact.name}}. Patient {{patient_name}}({{patient_id}}). ' +
                   'Value {{fields.value}}',
          locale: 'test'
        }],
        recipient: CONTACT_TYPES.HEALTH_CENTER,
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
  {
    _id: 'report5',
    type: 'data_record',
    contact: {
      _id: 'chw1',
      parent: { _id: 'clinic1', parent: { _id: CONTACT_TYPES.HEALTH_CENTER, parent: { _id: 'district_hospital' } } }
    },
    fields: { patient_id: 'patient1', value: 3 },
    reported_date: moment(threeDaysAgo).valueOf(),
    scheduled_tasks: [
      {
        due: null,
        message_key: 'messages.one',
        recipient: 'clinic',
        state_history: [],
        state: 'scheduled',
      },
      {
        due: null,
        timestamp: moment(twoDaysAgo).valueOf(),
        message_key: 'messages.two',
        recipient: 'clinic',
        state_history: [],
        state: 'scheduled',
      },
      {
        due: null,
        timestamp: moment(threeDaysAgo).valueOf(),
        message_key: 'messages.one',
        recipient: 'ancestor:health_center',
        state_history: [],
        state: 'scheduled',
      },
    ],
  },
  {
    _id: 'report6',
    type: 'data_record',
    contact: {
      _id: 'chw1',
      parent: { _id: 'clinic1', parent: { _id: CONTACT_TYPES.HEALTH_CENTER, parent: { _id: 'district_hospital' } } }
    },
    fields: { place_id: 'the_clinic', value: 33 },
    reported_date: moment(threeDaysAgo).valueOf(),
    scheduled_tasks: [
      {
        due: null,
        message_key: 'messages.clinic',
        recipient: 'clinic',
        state_history: [],
        state: 'scheduled',
      },
      {
        due: null,
        timestamp: moment(twoDaysAgo).valueOf(),
        message_key: 'messages.clinic',
        recipient: 'clinic',
        state_history: [],
        state: 'scheduled',
      },
      {
        due: null,
        timestamp: moment(threeDaysAgo).valueOf(),
        message_key: 'messages.clinic',
        recipient: 'ancestor:health_center',
        state_history: [],
        state: 'scheduled',
      },
    ],
  },
  {
    _id: 'report7',
    type: 'data_record',
    contact: {
      _id: 'chw1',
      parent: { _id: 'clinic1', parent: { _id: CONTACT_TYPES.HEALTH_CENTER, parent: { _id: 'district_hospital' } } }
    },
    fields: { patient_id: '', value: 2, patient_uuid: 'patient_2' },
    reported_date: oneMonthAgo,
    scheduled_tasks: [
      {
        due: twoDaysAgo, // task with translation sent to "clinic"
        message_key: 'messages.one',
        recipient: 'clinic',
        state_history: [],
        state: 'scheduled',
      },
      {
        due: threeDaysAgo, // task with translation sent to "sender"
        message_key: 'messages.two',
        recipient: 'reporting_unit',
        state_history: [],
        state: 'scheduled',
      },
      {
        due: threeDaysAgo, // task with text
        message: [{
          content: 'THREE. Reported by {{contact.name}}. Patient {{patient_name}}({{patient_id}}). ' +
            'Value {{fields.value}}',
          locale: 'test'
        }],
        recipient: CONTACT_TYPES.HEALTH_CENTER,
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
};

const translations = {
  'messages.one':
    'ONE. Reported by {{contact.name}}. Patient {{patient_name}} ({{patient_id}}). Value {{fields.value}}',
  'messages.two':
    'TWO. Reported by {{contact.name}}. Patient {{patient_name}} ({{patient_id}}). Value {{fields.value}}',
  'messages.clinic':
    'CLINIC. Reported by {{contact.name}}. Place {{place.name}} ({{place.place_id}}). Value {{fields.value}}'
};

const ids = reports.map(report => report._id);

describe('Due Tasks', () => {
  before(() => utils
    .saveDocs(contacts)
    .then(() => utils.addTranslations('test', translations))
    .then(() => utils.updateSettings(settings, { ignoreReload: 'sentinel' })));
  after(() => utils.revertDb([], true));

  it('should process scheduled messages correctly', async () => {
    await sentinelUtils.waitForSentinel();
    await utils.toggleSentinelTransitions();
    await utils.saveDocs(reports);
    await utils.toggleSentinelTransitions();
    await utils.runSentinelTasks();
    await sentinelUtils.waitForSentinel(ids);
    // we can't reliably *know* when the scheduler has finished processing the docs,
    // so I'm just waiting for the revs to change

    await utils.waitForDocRev([
      { id: 'report3', rev: 2 },
      { id: 'report4', rev: 2 },
      { id: 'report5', rev: 2 },
      { id: 'report6', rev: 2 },
      { id: 'report7', rev: 2 }
    ]);

    const [ report1, report2, report3, report4, report5, report6, report7 ] = await utils.getDocs(ids);
    chai.expect(report1._id).to.equal('report1');
    chai.expect(report1.scheduled_tasks).to.equal(undefined);

    // report2 should not have been changed
    chai.expect(report2).to.deep.nested.include({
      _id: 'report2',
      'scheduled_tasks[0].state': 'scheduled',
      'scheduled_tasks[1].state': 'scheduled',
      'scheduled_tasks[2].state': 'other_than_scheduled',
    });
    chai.expect(report2.scheduled_tasks.every(task => !task.messages)).to.be.true;

    // report 3 should have been edited
    chai.expect(report3).to.deep.nested.include({
      _id: 'report3',
      'scheduled_tasks[0].state': 'scheduled',
      'scheduled_tasks[1].state': 'scheduled',
      'scheduled_tasks[2].state': 'sent',
      'scheduled_tasks[3].state': 'pending',
    });

    chai.expect(report3.scheduled_tasks[3].messages[0]).to.include({
      message: 'ONE. Reported by Chw1. Patient Patient1 (patient1). Value 2',
      to: '555666' // ancestor:health_center
    });
    chai.expect(report3.scheduled_tasks[0].messages).to.equal(undefined);
    chai.expect(report3.scheduled_tasks[1].messages).to.equal(undefined);
    chai.expect(report3.scheduled_tasks[2].messages).to.equal(undefined);

    // report 4 should have been edited
    chai.expect(report4).to.deep.nested.include({
      _id: 'report4',
      'scheduled_tasks[0].state': 'pending',
      'scheduled_tasks[1].state': 'pending',
      'scheduled_tasks[2].state': 'pending',
      'scheduled_tasks[3].state': 'scheduled',
    });
    chai.expect(report4.scheduled_tasks[0].messages[0]).to.include({
      message: 'ONE. Reported by Chw1. Patient Patient2 (patient2). Value 2',
      to: '222333' // clinic
    });

    chai.expect(report4.scheduled_tasks[1].messages[0]).to.include({
      message: 'TWO. Reported by Chw1. Patient Patient2 (patient2). Value 2',
      to: '111222' // reporting_unit
    });

    chai.expect(report4.scheduled_tasks[2].messages[0]).to.include({
      message: 'THREE. Reported by Chw1. Patient Patient2(patient2). Value 2',
      to: '555666' // health_center
    });

    chai.expect(report4.scheduled_tasks[3].messages).to.equal(undefined);

    // report 5 should have been edited
    chai.expect(report5).to.deep.nested.include({
      _id: 'report5',
      'scheduled_tasks[0].state': 'pending',
      'scheduled_tasks[1].state': 'pending',
      'scheduled_tasks[2].state': 'pending',

      'scheduled_tasks[0].messages[0].message': 'ONE. Reported by Chw1. Patient Patient1 (patient1). Value 3',
      'scheduled_tasks[0].messages[0].to': '111222', // clinic

      'scheduled_tasks[1].messages[0].message': 'TWO. Reported by Chw1. Patient Patient1 (patient1). Value 3',
      'scheduled_tasks[1].messages[0].to': '111222', // clinic

      'scheduled_tasks[2].messages[0].message': 'ONE. Reported by Chw1. Patient Patient1 (patient1). Value 3',
      'scheduled_tasks[2].messages[0].to': '555666', // health_center
    });

    // report 6 should have been edited
    chai.expect(report6).to.deep.nested.include({
      _id: 'report6',
      'scheduled_tasks[0].state': 'pending',
      'scheduled_tasks[1].state': 'pending',
      'scheduled_tasks[2].state': 'pending',

      'scheduled_tasks[0].messages[0].message': 'CLINIC. Reported by Chw1. Place clinic1 (the_clinic). Value 33',
      'scheduled_tasks[0].messages[0].to': '111222', // clinic

      'scheduled_tasks[1].messages[0].message': 'CLINIC. Reported by Chw1. Place clinic1 (the_clinic). Value 33',
      'scheduled_tasks[1].messages[0].to': '111222', // clinic

      'scheduled_tasks[2].messages[0].message': 'CLINIC. Reported by Chw1. Place clinic1 (the_clinic). Value 33',
      'scheduled_tasks[2].messages[0].to': '555666', // health_center
    });

    // report 7 should have been edited
    chai.expect(report7).to.deep.nested.include({
      _id: 'report7',
      'scheduled_tasks[0].state': 'pending',
      'scheduled_tasks[1].state': 'pending',
      'scheduled_tasks[2].state': 'pending',
      'scheduled_tasks[3].state': 'scheduled',
    });
    chai.expect(report7.scheduled_tasks[0].messages[0]).to.include({
      message: 'ONE. Reported by Chw1. Patient Patient2 (patient2). Value 2',
      to: '222333' // clinic
    });

    chai.expect(report7.scheduled_tasks[1].messages[0]).to.include({
      message: 'TWO. Reported by Chw1. Patient Patient2 (patient2). Value 2',
      to: '111222' // reporting_unit
    });

    chai.expect(report7.scheduled_tasks[2].messages[0]).to.include({
      message: 'THREE. Reported by Chw1. Patient Patient2(patient2). Value 2',
      to: '555666' // health_center
    });
    chai.expect(report7.scheduled_tasks[3].messages).to.equal(undefined);
  });

  it('should not reset already-sent tasks when another task with the same due date is stuck in scheduled', async () => {
    // Reproduction of https://github.com/medic/cht-core/issues/10802
    // When a document has two scheduled_tasks with the same due date and one is stuck in
    // 'scheduled' state (e.g. missing translation), dueTasks should NOT reset the other
    // task that has already been sent back to 'pending'.
    await sentinelUtils.waitForSentinel();
    await utils.toggleSentinelTransitions();
    await utils.saveDoc(reportWithDuplicateDueDate);
    await utils.toggleSentinelTransitions();
    await utils.runSentinelTasks();
    await sentinelUtils.waitForSentinel([reportWithDuplicateDueDate._id]);

    // Wait briefly for dueTasks scheduler to process
    await new Promise(resolve => setTimeout(resolve, 5000));

    const report = await utils.getDoc(reportWithDuplicateDueDate._id);

    // Task A (already sent) should NOT have been changed to pending
    chai.expect(report.scheduled_tasks[0].state).to.equal('sent',
      'Already-sent task should not be reset to pending when another task with the same due date is scheduled');

    // Task B (stuck with missing translation) should remain scheduled
    chai.expect(report.scheduled_tasks[1].state).to.equal('scheduled',
      'Task with missing translation should remain in scheduled state');
    chai.expect(report.scheduled_tasks[1].messages).to.equal(undefined);
  });
});
