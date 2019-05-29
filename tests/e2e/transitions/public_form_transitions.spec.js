const sentinelUtils = require('../sentinel/utils'),
      utils = require('../../utils'),
      apiUtils = require('./utils');

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
    _id: 'clinic1',
    name: 'Clinic',
    type: 'clinic',
    parent: { _id: 'health_center', parent: { _id: 'district_hospital' } },
    contact: { _id: 'chw1', parent:  { _id: 'clinic1', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } } },
    reported_date: new Date().getTime()
  },
  {
    _id: 'chw1',
    type: 'person',
    parent: { _id: 'clinic1', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } },
    phone: 'phone1',
    name: 'chw1',
    reported_date: new Date().getTime()
  },
  {
    _id: 'chw2',
    type: 'person',
    parent: { _id: 'clinic1', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } },
    phone: 'phone2',
    name: 'chw2',
    reported_date: new Date().getTime()
  }
];

const patients = [
  {
    _id: 'person1',
    name: 'Person',
    type: 'person',
    patient_id: 'patient1',
    parent: { _id: 'clinic1', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } },
    reported_date: new Date().getTime()
  },
  {
    _id: 'person2',
    name: 'Person',
    type: 'person',
    patient_id: 'patient2',
    parent: { _id: 'clinic1', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } },
    reported_date: new Date().getTime()
  }
];

const transitions = {
  update_clinics: true,
  accept_patient_reports: true,
  conditional_alerts: true,
  death_reporting: true,
  multi_report_alerts: true,
  muting: true,
  registration: true
};

const transitionsConfig = {
  patient_reports: [{
    form: 'TEMP',
    messages: [{
      event_type: 'registration_not_found',
      message: [{
        locale: 'en',
        content: 'Patient not found'
      }],
    }, {
      event_type: 'report_accepted',
      message: [{
        locale: 'en',
        content: 'accept_patient_reports msg'
      }],
    }]
  }],
  alerts: [{
    form: 'TEMP',
    condition: 'doc.reported_date',
    message: 'conditional_alerts msg',
    recipient: 'reporting_unit'
  }],
  death_reporting: {
    mark_deceased_forms: ['DEATH'],
    date_field: 'reported_date'
  },
  registrations: [{
    form: 'TEMP',
    events: [{
      name: 'on_create',
      trigger: 'assign_schedule',
      params: 'new patient',
      bool_expr: ''
    }],
    messages: [{
      event_type: 'report_accepted',
      message: [{
        locale: 'en',
        content: 'registration msg'
      }],
    }],
  }],
  multi_report_alerts: [{
    name: 'test',
    is_report_counted: 'function(r, l) { return true }',
    num_reports_threshold: 1,
    message: 'multi_report_alerts msg',
    recipients: ['new_report.from'],
    time_window_in_days: 1,
    forms: ['MUTE']
  }],
  muting: {
    mute_forms: ['MUTE']
  },
  schedules: [{
    name: 'new patient',
    start_from: 'reported_date',
    messages: [{
      offset: '1 month',
      message: [{
        locale: 'en',
        content: 'Revisit patient {{patient_id}}'
      }],
    }]
  }]
};

const formsConfig = {
  MUTE: {
    meta: { label: { en: 'Mute' }, code: 'MUTE'},
    fields: {
      patient_id: {
        labels: { short: { translation_key: 'patient_id' }},
        position: 1,
        type: 'string',
        length: [5, 13],
        required: true
      }
    }
  },
  DEATH: {
    meta: { label: { en: 'Death reporting' }, code: 'DEATH'},
    fields: {
      patient_id: {
        labels: { short: { translation_key: 'patient_id' }},
        position: 1,
        type: 'string',
        length: [5, 13],
        required: true
      }
    }
  },
  TEMP: {
    meta: { label: { en: 'Fever reporting' }, code: 'TEMP'},
    fields: {
      patient_id: {
        labels: { short: { translation_key: 'patient_id' }},
        position: 0,
        type: 'string',
        length: [5, 13],
        required: true
      },
      temp: {
        labels: { short: { translation_key: 'temp' }},
        position: 1,
        type: 'string',
        length: [1, 2],
        required: true
      }
    }
  }
};

const messages = [{
  id: 'temp_known_contact',
  from: 'phone1',
  content: 'TEMP patient1 37.5'
}, {
  id: 'temp_unknown_contact',
  from: 'phone-unknown',
  content: 'TEMP patient1 37.5'
}, {
  id: 'death_known_contact',
  from: 'phone2',
  content: 'DEATH patient2'
}, {
  id: 'death_unknown_contact',
  from: 'phone-unknown',
  content: 'DEATH patient1'
}, {
  id: 'mute_known_contact',
  from: 'phone2',
  content: 'MUTE patient2'
}, {
  id: 'mute_unknown_contact',
  from: 'phone-unknown',
  content: 'MUTE patient1'
}];

const getPostOpts = (path, body) => ({
  path: path,
  method: 'POST',
  headers: { 'Content-Type':'application/json' },
  body: body
});

const expectTransitions = (infodoc, ...transitions) => {
  expect(infodoc.transitions).toBeDefined();
  expect(Object.keys(infodoc.transitions).length).toEqual(transitions.length);
  transitions.forEach(transition => {
    expect(infodoc.transitions[transition]).toBeDefined();
    expect(infodoc.transitions[transition].ok).toEqual(true);
  });
};

const chw1Lineage = { _id: contacts[3]._id,  parent: contacts[3].parent };
const chw2Lineage = { _id: contacts[4]._id,  parent: contacts[4].parent };

describe('Transitions public_form', () => {
  beforeAll(done => utils.saveDocs(contacts).then(done));
  beforeEach(done => utils.saveDocs(patients).then(done));
  afterAll(done => utils.revertDb().then(done));
  afterEach(done => utils.revertDb(contacts.map(c => c._id), true).then(done));

  it('when false, reports from unknwon sources should not be accepted', () => {
    Object.keys(formsConfig).forEach(form => formsConfig[form].public_form = false);
    const settings = Object.assign(
      {},
      { transitions },
      { forms: formsConfig },
      transitionsConfig
    );

    let ids;

    return utils
      .updateSettings(settings)
      .then(() => Promise.all([
        apiUtils.getApiSmsChanges(messages),
        utils.request(getPostOpts('/api/sms', { messages: messages }))
      ]))
      .then(([ changes ]) => {
        ids = changes.map(change => change.id);
      })
      .then(() => sentinelUtils.waitForSentinel(ids))
      .then(() => Promise.all([
        utils.getDocs(ids),
        sentinelUtils.getInfoDocs(ids),
        utils.getDoc('person1'),
        utils.getDoc('person2')
      ]))
      .then(([ docs, infos, patient1, patient2 ]) => {
        let doc,
            info;

        // temp_known_contact
        doc = docs.find(doc => doc.sms_message.gateway_ref === 'temp_known_contact');
        info = infos.find(info => info.doc_id === doc._id);
        expectTransitions(info, 'update_clinics', 'accept_patient_reports', 'conditional_alerts', 'registration');
        expect(doc.contact).toEqual(chw1Lineage);
        expect(doc.tasks.length).toEqual(3);
        expect(doc.tasks.find(task => task.messages[0].message === 'registration msg')).toBeDefined();
        expect(doc.tasks.find(task => task.messages[0].message === 'conditional_alerts msg')).toBeDefined();
        expect(doc.tasks.find(task => task.messages[0].message === 'accept_patient_reports msg')).toBeDefined();
        expect(doc.scheduled_tasks.length).toEqual(1);

        // temp_unknown_contact
        doc = docs.find(doc => doc.sms_message.gateway_ref === 'temp_unknown_contact');
        info = infos.find(info => info.doc_id === doc._id);
        expectTransitions(info);
        expect(doc.contact).not.toBeDefined();
        expect(doc.errors.length).toEqual(1);
        expect(doc.tasks.length).toEqual(0);
        expect(doc.scheduled_tasks).not.toBeDefined();

        // death_known_contact
        doc = docs.find(doc => doc.sms_message.gateway_ref === 'death_known_contact');
        info = infos.find(info => info.doc_id === doc._id);
        expectTransitions(info, 'update_clinics', 'death_reporting');
        expect(doc.contact).toEqual(chw2Lineage);
        expect(patient2.date_of_death).toEqual(doc.reported_date);

        // death_unknown_contact
        doc = docs.find(doc => doc.sms_message.gateway_ref === 'death_unknown_contact');
        info = infos.find(info => info.doc_id === doc._id);
        expectTransitions(info);
        expect(doc.contact).not.toBeDefined();
        expect(doc.tasks.length).toEqual(0);
        expect(doc.scheduled_tasks).not.toBeDefined();
        expect(doc.errors.length).toEqual(1);
        expect(patient1.date_of_death).not.toBeDefined();

        // mute_known_contact
        doc = docs.find(doc => doc.sms_message.gateway_ref === 'mute_known_contact');
        info = infos.find(info => info.doc_id === doc._id);
        expectTransitions(info, 'update_clinics', 'muting', 'multi_report_alerts');
        expect(doc.contact).toEqual(chw2Lineage);
        expect(doc.tasks.length).toEqual(1);
        expect(doc.tasks[0].messages[0].message).toEqual('multi_report_alerts msg');
        expect(doc.scheduled_tasks).not.toBeDefined();
        expect(patient2.muted).toBeDefined();

        // mute_unknown_contact
        doc = docs.find(doc => doc.sms_message.gateway_ref === 'mute_unknown_contact');
        info = infos.find(info => info.doc_id === doc._id);
        expectTransitions(info);
        expect(doc.contact).not.toBeDefined();
        expect(doc.errors.length).toEqual(1);
        expect(doc.tasks.length).toEqual(0);
        expect(doc.scheduled_tasks).not.toBeDefined();
        expect(patient1.muted).not.toBeDefined();
      });
  });

  it('when true, reports from unknwon sources should be accepted', () => {
    Object.keys(formsConfig).forEach(form => formsConfig[form].public_form = true);
    const settings = Object.assign(
      {},
      { transitions },
      { forms: formsConfig },
      transitionsConfig
    );

    let ids;

    return utils
      .updateSettings(settings)
      .then(() => Promise.all([
        apiUtils.getApiSmsChanges(messages),
        utils.request(getPostOpts('/api/sms', { messages: messages }))
      ]))
      .then(([ changes ]) => {
        ids = changes.map(change => change.id);
      })
      .then(() => sentinelUtils.waitForSentinel(ids))
      .then(() => Promise.all([
        utils.getDocs(ids),
        sentinelUtils.getInfoDocs(ids),
        utils.getDoc('person1'),
        utils.getDoc('person2')
      ]))
      .then(([ docs, infos, patient1, patient2 ]) => {
        let doc,
            info;

        // temp_known_contact
        doc = docs.find(doc => doc.sms_message.gateway_ref === 'temp_known_contact');
        info = infos.find(info => info.doc_id === doc._id);
        expectTransitions(info, 'update_clinics', 'accept_patient_reports', 'conditional_alerts', 'registration');
        expect(doc.contact).toEqual(chw1Lineage);
        expect(doc.tasks.length).toEqual(3);
        expect(doc.tasks.find(task => task.messages[0].message === 'registration msg')).toBeDefined();
        expect(doc.tasks.find(task => task.messages[0].message === 'conditional_alerts msg')).toBeDefined();
        expect(doc.tasks.find(task => task.messages[0].message === 'accept_patient_reports msg')).toBeDefined();
        expect(doc.scheduled_tasks.length).toEqual(1);

        // temp_unknown_contact
        doc = docs.find(doc => doc.sms_message.gateway_ref === 'temp_unknown_contact');
        info = infos.find(info => info.doc_id === doc._id);
        expectTransitions(info, 'accept_patient_reports', 'conditional_alerts', 'registration');
        expect(doc.contact).not.toBeDefined();
        expect(doc.errors.length).toEqual(0);
        expect(doc.tasks.length).toEqual(3);
        expect(doc.tasks.find(task => task.messages[0].message === 'registration msg')).toBeDefined();
        expect(doc.tasks.find(task => task.messages[0].message === 'conditional_alerts msg')).toBeDefined();
        expect(doc.tasks.find(task => task.messages[0].message === 'accept_patient_reports msg')).toBeDefined();
        expect(doc.scheduled_tasks.length).toEqual(1);

        // death_known_contact
        doc = docs.find(doc => doc.sms_message.gateway_ref === 'death_known_contact');
        info = infos.find(info => info.doc_id === doc._id);
        expectTransitions(info, 'update_clinics', 'death_reporting');
        expect(doc.contact).toEqual(chw2Lineage);
        expect(patient2.date_of_death).toEqual(doc.reported_date);

        // death_unknown_contact
        doc = docs.find(doc => doc.sms_message.gateway_ref === 'death_unknown_contact');
        info = infos.find(info => info.doc_id === doc._id);
        expectTransitions(info, 'death_reporting');
        expect(doc.contact).not.toBeDefined();
        expect(doc.errors.length).toEqual(0);
        expect(patient1.date_of_death).toEqual(doc.reported_date);

        // mute_known_contact
        doc = docs.find(doc => doc.sms_message.gateway_ref === 'mute_known_contact');
        info = infos.find(info => info.doc_id === doc._id);
        expectTransitions(info, 'update_clinics', 'muting', 'multi_report_alerts');
        expect(doc.contact).toEqual(chw2Lineage);
        expect(doc.tasks.length).toEqual(1);
        expect(doc.tasks[0].messages[0].message).toEqual('multi_report_alerts msg');
        expect(doc.scheduled_tasks).not.toBeDefined();
        expect(patient2.muted).toBeDefined();

        // mute_unknown_contact
        doc = docs.find(doc => doc.sms_message.gateway_ref === 'mute_unknown_contact');
        info = infos.find(info => info.doc_id === doc._id);
        expectTransitions(info, 'muting', 'multi_report_alerts');
        expect(doc.contact).not.toBeDefined();
        expect(doc.errors.length).toEqual(0);
        expect(doc.tasks.length).toEqual(1);
        expect(doc.tasks[0].messages[0].message).toEqual('multi_report_alerts msg');
        expect(doc.scheduled_tasks).not.toBeDefined();
        expect(patient1.muted).toBeDefined();
      });
  });

  it('should default to false', () => {
    Object.keys(formsConfig).forEach(form => delete formsConfig[form].public_form);

    const settings = Object.assign(
      {},
      { transitions },
      { forms: formsConfig },
      transitionsConfig
    );

    let ids;

    return utils
      .updateSettings(settings)
      .then(() => Promise.all([
        apiUtils.getApiSmsChanges(messages),
        utils.request(getPostOpts('/api/sms', { messages: messages }))
      ]))
      .then(([ changes ]) => {
        ids = changes.map(change => change.id);
      })
      .then(() => sentinelUtils.waitForSentinel(ids))
      .then(() => Promise.all([
        utils.getDocs(ids),
        sentinelUtils.getInfoDocs(ids),
        utils.getDoc('person1'),
        utils.getDoc('person2')
      ]))
      .then(([ docs, infos, patient1, patient2 ]) => {
        let doc,
            info;

        // temp_known_contact
        doc = docs.find(doc => doc.sms_message.gateway_ref === 'temp_known_contact');
        info = infos.find(info => info.doc_id === doc._id);
        expectTransitions(info, 'update_clinics', 'accept_patient_reports', 'conditional_alerts', 'registration');
        expect(doc.contact).toEqual(chw1Lineage);
        expect(doc.tasks.length).toEqual(3);
        expect(doc.tasks.find(task => task.messages[0].message === 'registration msg')).toBeDefined();
        expect(doc.tasks.find(task => task.messages[0].message === 'conditional_alerts msg')).toBeDefined();
        expect(doc.tasks.find(task => task.messages[0].message === 'accept_patient_reports msg')).toBeDefined();
        expect(doc.scheduled_tasks.length).toEqual(1);

        // temp_unknown_contact
        doc = docs.find(doc => doc.sms_message.gateway_ref === 'temp_unknown_contact');
        info = infos.find(info => info.doc_id === doc._id);
        expectTransitions(info);
        expect(doc.contact).not.toBeDefined();
        expect(doc.errors.length).toEqual(1);
        expect(doc.tasks.length).toEqual(0);
        expect(doc.scheduled_tasks).not.toBeDefined();

        // death_known_contact
        doc = docs.find(doc => doc.sms_message.gateway_ref === 'death_known_contact');
        info = infos.find(info => info.doc_id === doc._id);
        expectTransitions(info, 'update_clinics', 'death_reporting');
        expect(doc.contact).toEqual(chw2Lineage);
        expect(patient2.date_of_death).toEqual(doc.reported_date);

        // death_unknown_contact
        doc = docs.find(doc => doc.sms_message.gateway_ref === 'death_unknown_contact');
        info = infos.find(info => info.doc_id === doc._id);
        expectTransitions(info);
        expect(doc.contact).not.toBeDefined();
        expect(doc.tasks.length).toEqual(0);
        expect(doc.scheduled_tasks).not.toBeDefined();
        expect(doc.errors.length).toEqual(1);
        expect(patient1.date_of_death).not.toBeDefined();

        // mute_known_contact
        doc = docs.find(doc => doc.sms_message.gateway_ref === 'mute_known_contact');
        info = infos.find(info => info.doc_id === doc._id);
        expectTransitions(info, 'update_clinics', 'muting', 'multi_report_alerts');
        expect(doc.contact).toEqual(chw2Lineage);
        expect(doc.tasks.length).toEqual(1);
        expect(doc.tasks[0].messages[0].message).toEqual('multi_report_alerts msg');
        expect(doc.scheduled_tasks).not.toBeDefined();
        expect(patient2.muted).toBeDefined();

        // mute_unknown_contact
        doc = docs.find(doc => doc.sms_message.gateway_ref === 'mute_unknown_contact');
        info = infos.find(info => info.doc_id === doc._id);
        expectTransitions(info);
        expect(doc.contact).not.toBeDefined();
        expect(doc.errors.length).toEqual(1);
        expect(doc.tasks.length).toEqual(0);
        expect(doc.scheduled_tasks).not.toBeDefined();
        expect(patient1.muted).not.toBeDefined();
      });
  });
});
