const sentinelUtils = require('@utils/sentinel');
const utils = require('@utils');
const apiUtils = require('./utils');
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
    _id: 'clinic1',
    name: 'Clinic',
    type: 'clinic',
    parent: { _id: 'health_center', parent: { _id: 'district_hospital' } },
    contact: {
      _id: 'chw1',
      parent:  { _id: 'clinic1', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
    },
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
  update_clinics: [ {
    form: 'TEMP',
    messages: [
      {
        event_type: 'sys.facility_not_found',
        recipient: 'reporting_unit',
        translation_key: 'sys.facility_not_found',
      }
    ],
  }, {
    form: 'MUTE',
    messages: [
      {
        event_type: 'sys.facility_not_found',
        recipient: 'reporting_unit',
        translation_key: 'sys.facility_not_found',
      }
    ],
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
  expect(Object.keys(infodoc.transitions)).to.have.lengthOf(transitions.length);
  transitions.forEach(transition => {
    expect(infodoc.transitions[transition].ok).to.be.true;
  });
};

const processSMS = (settings) => {
  let ids;
  const watchChanges = apiUtils.getApiSmsChanges(messages);
  return utils.updateSettings(settings, true)
    .then(() => Promise.all([
      watchChanges,
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
    ]));
};

const chw1Lineage = { _id: contacts[3]._id,  parent: contacts[3].parent };
const chw2Lineage = { _id: contacts[4]._id,  parent: contacts[4].parent };

describe('Transitions public_form', () => {
  before(async () => {
    await utils.saveDocs(contacts);
    await sentinelUtils.waitForSentinel();
  });
  beforeEach(async () => await utils.saveDocs(patients));
  after(async () => await utils.revertDb([], true));
  afterEach(async () => await utils.revertDb(contacts.map(c => c._id), true));

  it('when false, reports from unknwon sources should not be accepted', async () => {
    Object.keys(formsConfig).forEach(form => formsConfig[form].public_form = false);
    const settings = Object.assign(
      {},
      { transitions },
      { forms: formsConfig },
      transitionsConfig
    );

    const [ docs, infos, patient1, patient2 ] = await processSMS(settings);
    let doc;
    let info;

    // temp_known_contact
    doc = docs.find(doc => doc.sms_message.gateway_ref === 'temp_known_contact');
    info = infos.find(info => info.doc_id === doc._id);
    expectTransitions(info, 'update_clinics', 'accept_patient_reports', 'conditional_alerts', 'registration');
    expect(doc.contact).to.deep.equal(chw1Lineage);
    expect(doc.tasks).to.have.lengthOf(3);
    expect(doc.tasks.find(task => task.messages[0].message === 'registration msg')).to.have.property('messages');
    expect(doc.tasks.find(task => task.messages[0].message === 'conditional_alerts msg')).to.have.property('messages');
    expect(doc.tasks.find(task => task.messages[0].message === 'accept_patient_reports msg'))
      .to.have.property('messages');
    expect(doc.scheduled_tasks).to.have.lengthOf(1);

    // temp_unknown_contact
    doc = docs.find(doc => doc.sms_message.gateway_ref === 'temp_unknown_contact');
    info = infos.find(info => info.doc_id === doc._id);
    expectTransitions(info, 'update_clinics');
    expect(doc.contact).to.be.undefined;
    expect(doc.errors).to.have.lengthOf(1);
    expect(doc.tasks).to.have.lengthOf(1);
    expect(doc.scheduled_tasks).to.be.undefined;

    // death_known_contact
    doc = docs.find(doc => doc.sms_message.gateway_ref === 'death_known_contact');
    info = infos.find(info => info.doc_id === doc._id);
    expectTransitions(info, 'update_clinics', 'death_reporting');
    expect(doc.contact).to.deep.equal(chw2Lineage);
    expect(patient2.date_of_death).to.equal(doc.reported_date);

    // death_unknown_contact
    doc = docs.find(doc => doc.sms_message.gateway_ref === 'death_unknown_contact');
    info = infos.find(info => info.doc_id === doc._id);
    expectTransitions(info, 'update_clinics');
    expect(doc.contact).to.be.undefined;
    expect(doc.tasks).to.have.lengthOf(1);
    expect(doc.scheduled_tasks).to.be.undefined;
    expect(doc.errors).to.have.lengthOf(1);
    expect(patient1.date_of_death).to.be.undefined;

    // mute_known_contact
    doc = docs.find(doc => doc.sms_message.gateway_ref === 'mute_known_contact');
    info = infos.find(info => info.doc_id === doc._id);
    expectTransitions(info, 'update_clinics', 'muting', 'multi_report_alerts');
    expect(doc.contact).to.deep.equal(chw2Lineage);
    expect(doc.tasks).to.have.lengthOf(1);
    expect(doc.tasks[0].messages[0].message).to.equal('multi_report_alerts msg');
    expect(doc.scheduled_tasks).to.be.undefined;
    expect(patient2.muted).to.be.a('string').that.is.not.empty;

    // mute_unknown_contact
    doc = docs.find(doc => doc.sms_message.gateway_ref === 'mute_unknown_contact');
    info = infos.find(info => info.doc_id === doc._id);
    expectTransitions(info, 'update_clinics');
    expect(doc.contact).to.be.undefined;
    expect(doc.errors).to.have.lengthOf(1);
    expect(doc.tasks).to.have.lengthOf(1);
    expect(doc.scheduled_tasks).to.be.undefined;
    expect(patient1.muted).to.be.undefined;
  });

  it('when true, reports from unknwon sources should be accepted', async () => {
    Object.keys(formsConfig).forEach(form => formsConfig[form].public_form = true);
    const settings = Object.assign(
      {},
      { transitions },
      { forms: formsConfig },
      transitionsConfig
    );

    const [ docs, infos, patient1, patient2 ] = await processSMS(settings);
    let doc;
    let info;

    // temp_known_contact
    doc = docs.find(doc => doc.sms_message.gateway_ref === 'temp_known_contact');
    info = infos.find(info => info.doc_id === doc._id);
    expectTransitions(info, 'update_clinics', 'accept_patient_reports', 'conditional_alerts', 'registration');
    expect(doc.contact).to.deep.equal(chw1Lineage);
    expect(doc.tasks).to.have.lengthOf(3);
    expect(doc.tasks.find(task => task.messages[0].message === 'registration msg')).to.have.property('messages');
    expect(doc.tasks.find(task => task.messages[0].message === 'conditional_alerts msg')).to.have.property('messages');
    expect(doc.tasks.find(task => task.messages[0].message === 'accept_patient_reports msg'))
      .to.have.property('messages');
    expect(doc.scheduled_tasks).to.have.lengthOf(1);

    // temp_unknown_contact
    doc = docs.find(doc => doc.sms_message.gateway_ref === 'temp_unknown_contact');
    info = infos.find(info => info.doc_id === doc._id);
    expectTransitions(info, 'accept_patient_reports', 'conditional_alerts', 'registration');
    expect(doc.contact).to.be.undefined;
    expect(doc.errors).to.be.empty;
    expect(doc.tasks).to.have.lengthOf(3);
    expect(doc.tasks.find(task => task.messages[0].message === 'registration msg')).to.have.property('messages');
    expect(doc.tasks.find(task => task.messages[0].message === 'conditional_alerts msg')).to.have.property('messages');
    expect(doc.tasks.find(task => task.messages[0].message === 'accept_patient_reports msg'))
      .to.have.property('messages');
    expect(doc.scheduled_tasks).to.have.lengthOf(1);

    // death_known_contact
    doc = docs.find(doc => doc.sms_message.gateway_ref === 'death_known_contact');
    info = infos.find(info => info.doc_id === doc._id);
    expectTransitions(info, 'update_clinics', 'death_reporting');
    expect(doc.contact).to.deep.equal(chw2Lineage);
    expect(patient2.date_of_death).to.equal(doc.reported_date);

    // death_unknown_contact
    doc = docs.find(doc => doc.sms_message.gateway_ref === 'death_unknown_contact');
    info = infos.find(info => info.doc_id === doc._id);
    expectTransitions(info, 'death_reporting');
    expect(doc.contact).to.be.undefined;
    expect(doc.errors).to.be.empty;
    expect(patient1.date_of_death).to.equal(doc.reported_date);

    // mute_known_contact
    doc = docs.find(doc => doc.sms_message.gateway_ref === 'mute_known_contact');
    info = infos.find(info => info.doc_id === doc._id);
    expectTransitions(info, 'update_clinics', 'muting', 'multi_report_alerts');
    expect(doc.contact).to.deep.equal(chw2Lineage);
    expect(doc.tasks).to.have.lengthOf(1);
    expect(doc.tasks[0].messages[0].message).to.equal('multi_report_alerts msg');
    expect(doc.scheduled_tasks).to.be.undefined;
    expect(patient2.muted).to.be.a('string').that.is.not.empty;

    // mute_unknown_contact
    doc = docs.find(doc => doc.sms_message.gateway_ref === 'mute_unknown_contact');
    info = infos.find(info => info.doc_id === doc._id);
    expectTransitions(info, 'muting', 'multi_report_alerts');
    expect(doc.contact).to.be.undefined;
    expect(doc.errors).to.be.empty;
    expect(doc.tasks).to.have.lengthOf(1);
    expect(doc.tasks[0].messages[0].message).to.equal('multi_report_alerts msg');
    expect(doc.scheduled_tasks).to.be.undefined;
    expect(patient1.muted).to.be.a('string').that.is.not.empty;
  });

  it('should default to false', async () => {
    Object.keys(formsConfig).forEach(form => delete formsConfig[form].public_form);

    const settings = Object.assign(
      {},
      { transitions },
      { forms: formsConfig },
      transitionsConfig
    );

    const [ docs, infos, patient1, patient2 ] = await processSMS(settings);
    let doc;
    let info;

    // temp_known_contact
    doc = docs.find(doc => doc.sms_message.gateway_ref === 'temp_known_contact');
    info = infos.find(info => info.doc_id === doc._id);
    expectTransitions(info, 'update_clinics', 'accept_patient_reports', 'conditional_alerts', 'registration');
    expect(doc.contact).to.deep.equal(chw1Lineage);
    expect(doc.tasks).to.have.lengthOf(3);
    expect(doc.tasks.find(task => task.messages[0].message === 'registration msg')).to.have.property('messages');
    expect(doc.tasks.find(task => task.messages[0].message === 'conditional_alerts msg')).to.have.property('messages');
    expect(doc.tasks.find(task => task.messages[0].message === 'accept_patient_reports msg'))
      .to.have.property('messages');
    expect(doc.scheduled_tasks).to.have.lengthOf(1);

    // temp_unknown_contact
    doc = docs.find(doc => doc.sms_message.gateway_ref === 'temp_unknown_contact');
    info = infos.find(info => info.doc_id === doc._id);
    expectTransitions(info, 'update_clinics');
    expect(doc.contact).to.be.undefined;
    expect(doc.errors).to.have.lengthOf(1);
    expect(doc.tasks).to.have.lengthOf(1);
    expect(doc.scheduled_tasks).to.be.undefined;

    // death_known_contact
    doc = docs.find(doc => doc.sms_message.gateway_ref === 'death_known_contact');
    info = infos.find(info => info.doc_id === doc._id);
    expectTransitions(info, 'update_clinics', 'death_reporting');
    expect(doc.contact).to.deep.equal(chw2Lineage);
    expect(patient2.date_of_death).to.equal(doc.reported_date);

    // death_unknown_contact
    doc = docs.find(doc => doc.sms_message.gateway_ref === 'death_unknown_contact');
    info = infos.find(info => info.doc_id === doc._id);
    expectTransitions(info, 'update_clinics');
    expect(doc.contact).to.be.undefined;
    expect(doc.tasks).to.have.lengthOf(1);
    expect(doc.scheduled_tasks).to.be.undefined;
    expect(doc.errors).to.have.lengthOf(1);
    expect(patient1.date_of_death).to.be.undefined;

    // mute_known_contact
    doc = docs.find(doc => doc.sms_message.gateway_ref === 'mute_known_contact');
    info = infos.find(info => info.doc_id === doc._id);
    expectTransitions(info, 'update_clinics', 'muting', 'multi_report_alerts');
    expect(doc.contact).to.deep.equal(chw2Lineage);
    expect(doc.tasks).to.have.lengthOf(1);
    expect(doc.tasks[0].messages[0].message).to.equal('multi_report_alerts msg');
    expect(doc.scheduled_tasks).to.be.undefined;
    expect(patient2.muted).to.be.a('string').that.is.not.empty;

    // mute_unknown_contact
    doc = docs.find(doc => doc.sms_message.gateway_ref === 'mute_unknown_contact');
    info = infos.find(info => info.doc_id === doc._id);
    expectTransitions(info, 'update_clinics');
    expect(doc.contact).to.be.undefined;
    expect(doc.errors).to.have.lengthOf(1);
    expect(doc.tasks).to.have.lengthOf(1);
    expect(doc.scheduled_tasks).to.be.undefined;
    expect(patient1.muted).to.be.undefined;
  });
});
