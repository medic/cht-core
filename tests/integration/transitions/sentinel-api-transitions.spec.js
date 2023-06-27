const sentinelUtils = require('@utils/sentinel');
const utils = require('@utils');
const apiUtils = require('./utils');
const chai = require('chai');

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
  },
  {
    _id: 'clinic2',
    name: 'Clinic',
    type: 'clinic',
    parent: { _id: 'health_center', parent: { _id: 'district_hospital' } },
    contact: {
      _id: 'chw2',
      parent:  { _id: 'clinic2', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
    },
    reported_date: new Date().getTime()
  },
  {
    _id: 'chw2',
    type: 'person',
    parent: { _id: 'clinic2', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } },
    phone: 'phone2',
    name: 'chw2',
    reported_date: new Date().getTime()
  },
  {
    _id: 'person3',
    name: 'Person',
    type: 'person',
    patient_id: 'patient3',
    parent: { _id: 'clinic2', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } },
    reported_date: new Date().getTime()
  },
  {
    _id: 'person4',
    name: 'Person',
    type: 'person',
    patient_id: 'patient4',
    parent: { _id: 'clinic2', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } },
    reported_date: new Date().getTime()
  }
];

const transitionsConfig = {
  patient_reports: [{
    form: 'TEMP',
    validations: {
      list: [
        {
          property: 'temp',
          rule: 'min(30) && max(60)',
          message: [{
            locale: 'en',
            content: 'Temperature seems incorrect'
          }],
        },
      ],
      join_responses: false
    },
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
        content: 'Temperature registered'
      }],
    }]
  }],
  alerts: [{
    form: 'TEMP',
    condition: 'doc.fields.temp > 39',
    message: 'Patient temperature high',
    recipient: 'reporting_unit'
  }],
  death_reporting: {
    mark_deceased_forms: ['DEATH'],
    date_field: 'reported_date'
  },
  muting: {
    mute_forms: ['MUTE'],
    messages: [{
      event_type: 'mute',
      message: [{
        locale: 'en',
        content: 'Patient {{patient_id}} muted'
      }],
    }]
  },
  default_responses: { start_date: '2018-01-01' },
  registrations: [{
    form: 'CHILD',
    events: [{
      name: 'on_create',
      trigger: 'add_patient',
      params: { patient_id_field: 'our_patient_id', patient_name_field: 'our_patient_name' },
      bool_expr: ''
    }, {
      name: 'on_create',
      trigger: 'assign_schedule',
      params: 'new patient',
      bool_expr: ''
    }],
    messages: [{
      event_type: 'report_accepted',
      message: [{
        locale: 'en',
        content: 'Patient {{patient_id}} created'
      }],
    }],
  }],
  schedules: [{
    name: 'new patient',
    start_from: 'reported_date',
    messages: [{
      offset: '1 month',
      message: [{
        locale: 'en',
        content: 'Revisit patient {{patient_id}}'
      }],
    }, {
      offset: '1 week',
      message: [{
        locale: 'en',
        content: 'First visit'
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
  },
  CHILD: {
    meta: { label: { en: 'Child registration' }, code: 'CHILD'},
    fields: {
      our_patient_id: {
        labels: { short: { translation_key: 'patient_id' }},
        position: 0,
        type: 'string',
        length: [5, 13],
        required: true
      },
      our_patient_name: {
        labels: { short: { translation_key: 'patient_name' }},
        position: 1,
        type: 'string',
        length: [2, 10],
        required: true
      }
    }
  }
};

const messages = [{
  id: 'temp_unknown_patient',
  from: 'phone1',
  content: 'TEMP 12345 37.5'
}, {
  id: 'temp_invalid',
  from: 'phone1',
  content: 'TEMP patient1 98'
}, {
  id: 'temp_successful',
  from: 'phone1',
  content: 'TEMP patient1 37'
}, {
  id: 'temp_high',
  from: 'phone2',
  content: 'TEMP patient2 40'
}, {
  id: 'unformatted',
  from: '+501234656887',
  content: 'This is a test message'
}, {
  id: 'form_not_found',
  from: 'phone2',
  content: 'TEPM patient1 38'
}, {
  id: 'new_child',
  from: 'phone2',
  content: 'CHILD child1 Child name'
}, {
  id: 'new_child_unknown',
  from: '+501234656887',
  content: 'CHILD child2 Child name'
}, {
  id: 'dead',
  from: 'phone1',
  content: 'DEATH patient3'
}, {
  id: 'mute',
  from: 'phone1',
  content: 'MUTE patient4'
}];

const getPostOpts = (path, body) => ({
  path: path,
  method: 'POST',
  headers: { 'Content-Type':'application/json' },
  body: body
});

const getDocByPatientId = patientId => {
  return utils
    .requestOnTestDb(
      `/_design/medic-client/_view/contacts_by_reference?key=["shortcode","${patientId}"]&include_docs=true`
    )
    .then(result => result.rows);
};

const expectTransitions = (infodoc, ...transitions) => {
  chai.expect(infodoc.transitions).to.be.an('object');
  chai.expect(Object.keys(infodoc.transitions).length).to.equal(transitions.length);
  transitions.forEach(transition => {
    chai.expect(infodoc.transitions[transition]).to.be.an('object');
    chai.expect(infodoc.transitions[transition].ok).to.equal(true);
  });
};

const isUntransitionedDoc = doc => {
  return doc._rev.startsWith('1-') &&
         (!doc.errors || !doc.errors.length) &&
         !doc.tasks.length &&
         !doc.scheduled_tasks &&
         !doc.contact &&
         !doc.patient_id;
};

const contactsRevs = [];

describe('transitions', () => {
  before(() => {
    return utils
      .saveDocs(contacts)
      .then((results) => contactsRevs.push(...results))
      .then(() => sentinelUtils.waitForSentinel());
  });
  after(() => utils.revertDb([], true));
  afterEach(() => utils.revertDb(contacts.map(c => c._id), true));

  it('should run all sync transitions and all async transitions', () => {
    const settings = {
      transitions: {
        accept_patient_reports: true,
        conditional_alerts: true,
        death_reporting: true,
        muting: true,
        default_responses: true,
        registration: true,
        update_clinics: true
      },
      forms: formsConfig,
      update_clinics: [ {
        form: 'CHILD',
        messages: [
          {
            event_type: 'sys.facility_not_found',
            recipient: 'reporting_unit',
            translation_key: 'sys.facility_not_found',
          }
        ],
      }]
    };
    Object.assign(settings, transitionsConfig);

    let docs;
    let ids;

    return utils
      .updateSettings(settings, true)
      .then(() => Promise.all([
        apiUtils.getApiSmsChanges(messages),
        utils.request(getPostOpts('/api/sms', { messages })),
      ]))
      .then(([ changes, messages ]) => {
        docs = changes.map(change => change.doc);
        ids = changes.map(change => change.id);

        let doc;

        //temp_unknown_patient
        doc = docs.find(doc => doc.sms_message.gateway_ref === 'temp_unknown_patient');
        chai.expect(doc.tasks.length).to.equal(1);
        chai.expect(doc.tasks[0].messages[0]).to.include({
          message: 'Patient not found',
          to: 'phone1'
        });
        chai.expect(doc.errors.length).to.equal(1);
        chai.expect(doc.errors[0].code).to.equal('registration_not_found');
        chai.expect(doc.scheduled_tasks).to.equal(undefined);
        chai.expect(doc.contact).to.be.an('object');
        chai.expect(doc.contact._id).to.equal('chw1');

        //temp_invalid
        doc = docs.find(doc => doc.sms_message.gateway_ref === 'temp_invalid');
        chai.expect(doc.tasks.length).to.equal(2);
        chai.expect(doc.tasks[0].messages[0]).to.include({
          message: 'Temperature seems incorrect',
          to: 'phone1'
        });
        chai.expect(doc.tasks[1].messages[0]).to.include({
          message: 'Patient temperature high',
          to: 'phone1'
        });
        chai.expect(doc.errors.length).to.equal(1);
        chai.expect(doc.errors[0].code).to.equal('invalid_temp');
        chai.expect(doc.scheduled_tasks).to.equal(undefined);
        chai.expect(doc.contact).to.be.an('object');
        chai.expect(doc.contact._id).to.equal('chw1');

        //temp_successful
        doc = docs.find(doc => doc.sms_message.gateway_ref === 'temp_successful');
        chai.expect(doc.tasks.length).to.equal(1);
        chai.expect(doc.tasks[0].messages[0]).to.include({
          message: 'Temperature registered',
          to: 'phone1'
        });
        chai.expect(doc.errors.length).to.equal(0);
        chai.expect(doc.scheduled_tasks).to.equal(undefined);
        chai.expect(doc.contact).to.be.an('object');
        chai.expect(doc.contact._id).to.equal('chw1');

        //temp_high
        doc = docs.find(doc => doc.sms_message.gateway_ref === 'temp_high');
        chai.expect(doc.tasks.length).to.equal(2);
        chai.expect(doc.tasks[0].messages[0]).to.include({
          message: 'Temperature registered',
          to: 'phone2'
        });
        chai.expect(doc.tasks[1].messages[0]).to.include({
          message: 'Patient temperature high',
          to: 'phone2'
        });
        chai.expect(doc.errors.length).to.equal(0);
        chai.expect(doc.scheduled_tasks).to.equal(undefined);
        chai.expect(doc.contact).to.be.an('object');
        chai.expect(doc.contact._id).to.equal('chw2');

        //unformatted
        doc = docs.find(doc => doc.sms_message.gateway_ref === 'unformatted');
        chai.expect(doc.tasks.length).to.equal(1);
        chai.expect(doc.tasks[0].messages[0].message.startsWith('SMS message received')).to.equal(true);
        chai.expect(doc.tasks[0].messages[0].to).to.equal('+501234656887');
        chai.expect(doc.errors.length).to.equal(1);
        chai.expect(doc.errors[0].code).to.equal('sys.facility_not_found');
        chai.expect(doc.scheduled_tasks).to.equal(undefined);
        chai.expect(doc.contact).to.equal(undefined);

        //form_not_found
        doc = docs.find(doc => doc.sms_message.gateway_ref === 'form_not_found');
        chai.expect(doc.tasks.length).to.equal(1);
        chai.expect(doc.tasks[0].messages[0].message.startsWith('SMS message received')).to.equal(true);
        chai.expect(doc.tasks[0].messages[0].to).to.equal('phone2');
        chai.expect(doc.errors.length).to.equal(0);
        chai.expect(doc.scheduled_tasks).to.equal(undefined);
        chai.expect(doc.contact).to.be.an('object');
        chai.expect(doc.contact._id).to.equal('chw2');

        //new_child
        doc = docs.find(doc => doc.sms_message.gateway_ref === 'new_child');
        chai.expect(doc.tasks.length).to.equal(1);
        chai.expect(doc.tasks[0].messages[0]).to.include({
          message: 'Patient child1 created',
          to: 'phone2'
        });
        chai.expect(doc.errors.length).to.equal(0);
        chai.expect(doc.contact).to.be.an('object');
        chai.expect(doc.contact._id).to.equal('chw2');
        chai.expect(doc.scheduled_tasks).to.be.an('array');
        chai.expect(doc.scheduled_tasks.length).to.equal(2);
        chai.expect(doc.scheduled_tasks[0].messages[0]).to.include({
          message: 'Revisit patient child1',
          to: 'phone2'
        });
        chai.expect(doc.scheduled_tasks[0].state).to.equal('scheduled');
        chai.expect(doc.scheduled_tasks[1].messages[0]).to.include({
          message: 'First visit',
          to: 'phone2'
        });
        chai.expect(doc.scheduled_tasks[1].state).to.equal('scheduled');

        //new_child_unknown
        doc = docs.find(doc => doc.sms_message.gateway_ref === 'new_child_unknown');
        chai.expect(doc.tasks.length).to.equal(1);
        chai.expect(doc.errors.length).to.equal(1);
        chai.expect(doc.errors[0].code).to.equal('sys.facility_not_found');
        chai.expect(doc.scheduled_tasks).to.equal(undefined);
        chai.expect(doc.contact).to.equal(undefined);
        chai.expect(doc.patient_id).to.equal(undefined);

        //dead
        doc = docs.find(doc => doc.sms_message.gateway_ref === 'dead');
        chai.expect(doc.tasks.length).to.equal(0);
        chai.expect(doc.errors.length).to.equal(0);
        chai.expect(doc.scheduled_tasks).to.equal(undefined);
        chai.expect(doc.contact).to.be.an('object');
        chai.expect(doc.contact._id).to.equal('chw1');

        //mute
        doc = docs.find(doc => doc.sms_message.gateway_ref === 'mute');
        chai.expect(doc.tasks.length).to.equal(0);
        chai.expect(doc.errors.length).to.equal(0);
        chai.expect(doc.scheduled_tasks).to.equal(undefined);
        chai.expect(doc.contact).to.be.an('object');
        chai.expect(doc.contact._id).to.equal('chw1');

        chai.expect(messages.messages.length).to.equal(10);
        // Extra task added to send message whne sys.facility_not_found error thrown
        chai.expect(docs.reduce((sum, doc) => sum + doc.tasks.length, 0)).to.equal(10);
        docs.forEach(doc => {
          doc.tasks.forEach(task => {
            task.messages.forEach(message => {
              chai.expect(messages.messages.find(m => m.id === message.uuid)).to.be.ok;
            });
          });
        });
      })
      .then(() => Promise.all([
        sentinelUtils.getInfoDocs(ids),
        getDocByPatientId('child1'),
        utils.getDoc('person3'),
        utils.getDoc('person4')
      ]))
      .then(([infos, child1, person3, person4]) => {
        let doc;
        let infodoc;

        //temp_unknown_patient
        doc = docs.find(doc => doc.sms_message.gateway_ref === 'temp_unknown_patient');
        infodoc = infos.find(info => info.doc_id === doc._id);
        expectTransitions(infodoc, 'default_responses', 'update_clinics', 'accept_patient_reports');

        //temp_invalid
        doc = docs.find(doc => doc.sms_message.gateway_ref === 'temp_invalid');
        infodoc = infos.find(info => info.doc_id === doc._id);
        expectTransitions(
          infodoc, 'default_responses', 'update_clinics', 'accept_patient_reports', 'conditional_alerts'
        );

        //temp_successful
        doc = docs.find(doc => doc.sms_message.gateway_ref === 'temp_successful');
        infodoc = infos.find(info => info.doc_id === doc._id);
        expectTransitions(infodoc, 'default_responses', 'update_clinics', 'accept_patient_reports');

        //temp_high
        doc = docs.find(doc => doc.sms_message.gateway_ref === 'temp_high');
        infodoc = infos.find(info => info.doc_id === doc._id);
        expectTransitions(
          infodoc, 'default_responses', 'update_clinics', 'accept_patient_reports', 'conditional_alerts'
        );

        //unformatted
        doc = docs.find(doc => doc.sms_message.gateway_ref === 'unformatted');
        infodoc = infos.find(info => info.doc_id === doc._id);
        expectTransitions(infodoc, 'default_responses', 'update_clinics');

        //form_not_found
        doc = docs.find(doc => doc.sms_message.gateway_ref === 'form_not_found');
        infodoc = infos.find(info => info.doc_id === doc._id);
        expectTransitions(infodoc, 'default_responses', 'update_clinics');

        //new_child
        doc = docs.find(doc => doc.sms_message.gateway_ref === 'new_child');
        infodoc = infos.find(info => info.doc_id === doc._id);
        expectTransitions(infodoc, 'default_responses', 'update_clinics', 'registration');

        //new_child_unknown
        doc = docs.find(doc => doc.sms_message.gateway_ref === 'new_child_unknown');
        infodoc = infos.find(info => info.doc_id === doc._id);
        expectTransitions(infodoc, 'default_responses', 'update_clinics');

        //dead
        doc = docs.find(doc => doc.sms_message.gateway_ref === 'dead');
        infodoc = infos.find(info => info.doc_id === doc._id);
        expectTransitions(infodoc, 'default_responses', 'update_clinics', 'death_reporting');

        //mute
        doc = docs.find(doc => doc.sms_message.gateway_ref === 'mute');
        infodoc = infos.find(info => info.doc_id === doc._id);
        // depending on how fast sentinel is, there's a chance muting transition already ran over this doc
        try {
          expectTransitions(infodoc, 'default_responses', 'update_clinics');
          chai.expect(infodoc.transitions.muting).to.equal(undefined);
        } catch (err) {
          expectTransitions(infodoc, 'default_responses', 'update_clinics', 'muting');
        }

        chai.expect(child1.length).to.equal(1);
        chai.expect(child1[0].doc.patient_id).to.equal('child1');
        chai.expect(child1[0].doc.parent._id).to.equal('clinic2');
        chai.expect(child1[0].doc.name).to.equal('Child name');

        chai.expect(person3.date_of_death).to.be.ok;

        if (person4._rev !== contactsRevs.find(result => result.id === person4._id).rev) {
          // if the rev changed, it means that Sentinel was super fast to process muting while we ran assertions
          chai.expect(person4.muted).to.be.ok;
        } else {
          chai.expect(person4.muted).to.equal(undefined);
        }
      })
      .then(() => sentinelUtils.waitForSentinel(ids))
      .then(() => Promise.all([
        sentinelUtils.getInfoDocs(ids),
        utils.getDocs(ids),
        utils.getDoc('person3'),
        utils.getDoc('person4')
      ]))
      .then(([infos, updated, person3, person4]) => {
        let doc;
        let infodoc;

        //temp_unknown_patient
        doc = docs.find(doc => doc.sms_message.gateway_ref === 'temp_unknown_patient');
        infodoc = infos.find(info => info.doc_id === doc._id);
        expectTransitions(infodoc, 'default_responses', 'update_clinics', 'accept_patient_reports');

        //temp_invalid
        doc = docs.find(doc => doc.sms_message.gateway_ref === 'temp_invalid');
        infodoc = infos.find(info => info.doc_id === doc._id);
        expectTransitions(
          infodoc, 'default_responses', 'update_clinics', 'accept_patient_reports', 'conditional_alerts'
        );

        //temp_successful
        doc = docs.find(doc => doc.sms_message.gateway_ref === 'temp_successful');
        infodoc = infos.find(info => info.doc_id === doc._id);
        expectTransitions(infodoc, 'default_responses', 'update_clinics', 'accept_patient_reports');

        //temp_high
        doc = docs.find(doc => doc.sms_message.gateway_ref === 'temp_high');
        infodoc = infos.find(info => info.doc_id === doc._id);
        expectTransitions(
          infodoc, 'default_responses', 'update_clinics', 'accept_patient_reports', 'conditional_alerts'
        );

        //unformatted
        doc = docs.find(doc => doc.sms_message.gateway_ref === 'unformatted');
        infodoc = infos.find(info => info.doc_id === doc._id);
        expectTransitions(infodoc, 'default_responses', 'update_clinics');

        //form_not_found
        doc = docs.find(doc => doc.sms_message.gateway_ref === 'form_not_found');
        infodoc = infos.find(info => info.doc_id === doc._id);
        expectTransitions(infodoc, 'default_responses', 'update_clinics');

        //new_child
        doc = docs.find(doc => doc.sms_message.gateway_ref === 'new_child');
        infodoc = infos.find(info => info.doc_id === doc._id);
        expectTransitions(infodoc, 'default_responses', 'update_clinics', 'registration');

        //new_child_unknown
        doc = docs.find(doc => doc.sms_message.gateway_ref === 'new_child_unknown');
        infodoc = infos.find(info => info.doc_id === doc._id);
        expectTransitions(infodoc, 'default_responses', 'update_clinics');

        //dead
        doc = docs.find(doc => doc.sms_message.gateway_ref === 'dead');
        infodoc = infos.find(info => info.doc_id === doc._id);
        expectTransitions(infodoc, 'default_responses', 'update_clinics', 'death_reporting');

        //mute
        doc = docs.find(doc => doc.sms_message.gateway_ref === 'mute');
        infodoc = infos.find(info => info.doc_id === doc._id);
        expectTransitions(infodoc, 'default_responses', 'update_clinics', 'muting');
        const updatedDoc = updated.find(u => u._id === doc._id);
        chai.expect(updatedDoc._rev).not.to.equal(doc._rev);
        chai.expect(updatedDoc.tasks.length).to.equal(1);
        chai.expect(updatedDoc.tasks[0].messages[0].message).to.equal('Patient patient4 muted');
        chai.expect(updatedDoc.tasks[0].state).to.equal('pending');

        chai.expect(person3.date_of_death).to.be.ok;
        chai.expect(person4.muted).to.be.ok;
      });
  });

  it('should not crash services when transitions are misconfigured', () => {
    const settings = {
      transitions: {
        accept_patient_reports: true,
        conditional_alerts: true,
        death_reporting: true,
        default_responses: true,
        registration: true,
        update_clinics: true
      },
      forms: formsConfig
    };

    delete transitionsConfig.death_reporting.mark_deceased_forms;
    Object.assign(settings, transitionsConfig);

    // we already killed patient 3 in the test above
    messages.find(message => message.id === 'dead').content = 'DEATH patient4';
    // we already muted patient4 in the test above
    messages.find(message => message.id === 'mute').content = 'MUTE patient3';

    let ids;

    return utils
      .updateSettings(settings, true)
      .then(() => Promise.all([
        apiUtils.getApiSmsChanges(messages),
        utils.request(getPostOpts('/api/sms', { messages: messages })),
      ]))
      .then(([changes, messages]) => {
        chai.expect(messages.messages.length).to.equal(0);
        chai.expect(changes.every(change => isUntransitionedDoc(change.doc))).to.equal(true);
        ids = changes.map(change => change.id);
      })
      // Sentinel won't process these, so we can't wait for a metadata update, but let's give it 5 seconds just in case
      .then(() => new Promise(resolve => setTimeout(() => resolve(), 5000)))
      .then(() => Promise.all([
        sentinelUtils.getInfoDocs(ids),
        utils.getDocs(ids)
      ]))
      .then(([infos, updatedDocs]) => {
        infos.forEach(info => chai.expect(!info));
        chai.expect(updatedDocs.every(isUntransitionedDoc)).to.equal(true);
      })
      .then(() => getDocByPatientId('child1'))
      .then(rows => {
        chai.expect(rows.length).to.equal(0);
      })
      .then(() => utils.getDocs(['person4', 'person3']))
      .then(([ person4, person3 ]) => {
        chai.expect(person4.date_of_death).to.equal(undefined);
        chai.expect(person3.muted).to.equal(undefined);
      });
  });

  it('should run transitions and save documents in series', () => {
    const settings = {
      transitions: {
        update_clinics: true,
        registration: true
      },
      registrations: [{
        form: 'IMM',
        events: [{
          name: 'on_create',
          trigger: 'assign_schedule',
          params: 'immunizations',
          bool_expr: ''
        }, {
          name: 'on_create',
          trigger: 'clear_schedule',
          params: 'immunizations',
          bool_expr: ''
        }]
      }],
      schedules: [{
        name: 'immunizations',
        start_from: 'reported_date',
        messages: [{
          offset: '10 days',
          message: [{
            locale: 'en',
            content: 'Immunize {{patient_id}} for disease A'
          }],
        }, {
          offset: '30 days',
          message: [{
            locale: 'en',
            content: 'Immunize {{patient_id}} for disease B'
          }],
        }]
      }],
      forms: {
        IMM: {
          meta: { label: { en: 'IMM' }, code: 'IMM'},
          fields: {
            patient_id: {
              labels: { short: { translation_key: 'patient_id' }},
              position: 1,
              type: 'string',
              length: [5, 13],
              required: true
            },
            count: {
              labels: { short: { translation_key: 'count' }},
              position: 1,
              type: 'string',
              length: [1],
              required: false
            }
          }
        }
      }
    };

    const messages = [{
      id: 'imm1',
      from: 'phone1',
      content: 'IMM patient2 1'
    }, {
      id: 'imm2',
      from: 'phone2',
      content: 'IMM patient2 2'
    }, {
      id: 'imm3',
      from: 'phone1',
      content: 'IMM patient2 3'
    }, {
      id: 'imm4',
      from: 'phone2',
      content: 'IMM patient2 4'
    }, {
      id: 'imm5',
      from: 'phone2',
      content: 'IMM patient1 1'
    }];

    let ids;

    return utils
      .updateSettings(settings, true)
      .then(() => Promise.all([
        apiUtils.getApiSmsChanges(messages),
        utils.request(getPostOpts('/api/sms', { messages: messages })),
      ]))
      .then(([changes, messages]) => {
        ids = changes.map(change => change.id);
        chai.expect(messages.messages).to.deep.equal([]);
      })
      .then(() => Promise.all([
        sentinelUtils.getInfoDocs(ids),
        utils.getDocs(ids)
      ]))
      .then(([ infos, docs ]) => {
        const immPatient2 = docs.filter(doc => doc.fields.patient_id === 'patient2');
        immPatient2.forEach(doc => {
          chai.expect(doc.contact).to.be.an('object');
          chai.expect(doc.scheduled_tasks.length).to.equal(2);
          chai.expect(doc.scheduled_tasks[0].messages[0].message).to.equal('Immunize patient2 for disease A');
          chai.expect(doc.scheduled_tasks[1].messages[0].message).to.equal('Immunize patient2 for disease B');
        });
        const scheduled = immPatient2.filter(doc => doc.scheduled_tasks.every(task => task.state === 'scheduled'));
        const cleared = immPatient2.filter(doc => doc.scheduled_tasks.every(task => task.state === 'cleared'));
        // only one doc has scheduled tasks!
        chai.expect(scheduled.length).to.equal(1);
        chai.expect(cleared.length).to.equal(3);

        const imm5 = docs.find(doc => doc.fields.patient_id === 'patient1');
        chai.expect(imm5.scheduled_tasks.length).to.equal(2);
        chai.expect(imm5.scheduled_tasks[0].messages[0].message).to.equal('Immunize patient1 for disease A');
        chai.expect(imm5.scheduled_tasks[0].state).to.equal('scheduled');
        chai.expect(imm5.scheduled_tasks[1].messages[0].message).to.equal('Immunize patient1 for disease B');
        chai.expect(imm5.scheduled_tasks[1].state).to.equal('scheduled');

        infos.forEach(info => {
          expectTransitions(info, 'update_clinics', 'registration');
        });
      });
  });

  it('should run async and sync transitions over the same doc successfully', () => {
    const settings = {
      transitions: {
        update_clinics: true,
        accept_patient_reports: true,
        multi_report_alerts: true
      },
      forms: {
        IMM: {
          meta: { label: { en: 'IMM' }, code: 'IMM'},
          fields: {
            patient_id: {
              labels: { short: { translation_key: 'patient_id' }},
              position: 1,
              type: 'string',
              length: [5, 13],
              required: true
            },
            count: {
              labels: { short: { translation_key: 'count' }},
              position: 1,
              type: 'string',
              length: [1],
              required: false
            }
          }
        }
      },
      patient_reports: [{
        form: 'IMM',
        messages: [{
          event_type: 'report_accepted',
          message: [{
            locale: 'en',
            content: 'patient_reports msg'
          }],
        }]
      }],
      multi_report_alerts: [{
        name: 'test',
        is_report_counted: 'function(r, l) { return true }',
        num_reports_threshold: 1,
        message: 'multi_report_alerts msg',
        recipients: ['new_report.from'],
        time_window_in_days: 1,
        forms: ['IMM']
      }]
    };

    const messages = [{
      id: 'imm1',
      from: 'phone1',
      content: 'IMM patient1 1'
    }];

    let docId;

    return utils
      .updateSettings(settings, true)
      .then(() => Promise.all([
        apiUtils.getApiSmsChanges(messages),
        utils.request(getPostOpts('/api/sms', { messages: messages })),
      ]))
      .then(([changes]) => {
        docId = changes[0].id;
      })
      .then(() => sentinelUtils.waitForSentinel(docId))
      .then(() => Promise.all([
        utils.getDoc(docId),
        sentinelUtils.getInfoDoc(docId)
      ]))
      .then(([doc, info]) => {
        chai.expect(doc.tasks.length).to.equal(2);
        chai.expect(doc.tasks[0].messages[0].message).to.equal('patient_reports msg');
        chai.expect(doc.tasks[1].messages[0].message).to.equal('multi_report_alerts msg');

        expectTransitions(info, 'update_clinics', 'accept_patient_reports', 'multi_report_alerts');
      });
  });

  it('should creating a patient that is already dead', () => {
    const settings = {
      transitions: { death_reporting: true, registration: true, update_clinics: true },
      death_reporting: {
        mark_deceased_forms: ['DEAD'],
        date_field: 'fields.time_of_death'
      },
      registrations: [{
        form: 'DEAD',
        events: [{
          name: 'on_create',
          trigger: 'add_patient',
          params: '',
          bool_expr: ''
        }],
        messages: [],
      }],
      forms: {
        DEAD: {
          meta: { label: { en: 'Dead' }, code: 'DEAD'},
          fields: {
            time_of_death: {
              labels: { short: { translation_key: 'time_of_death' }},
              position: 0,
              type: 'string',
              length: [2, 10],
              required: true
            },
            patient_name: {
              labels: { short: { translation_key: 'patient_name' }},
              position: 1,
              type: 'string',
              length: [2, 10],
              required: true
            },
          },
        },
      },
    };

    const messages = [{
      id: 'DEAD',
      from: 'phone1',
      content: 'DEAD 123456789 Veronica'
    }];

    let docId;

    return utils
      .updateSettings(settings, true)
      .then(() => Promise.all([
        apiUtils.getApiSmsChanges(messages),
        utils.request(getPostOpts('/api/sms', { messages: messages })),
      ]))
      .then(([changes]) => {
        docId = changes[0].id;
      })
      .then(() => sentinelUtils.waitForSentinel(docId))
      .then(() => sentinelUtils.getInfoDoc(docId))
      .then(info => {
        expectTransitions(info, 'update_clinics', 'registration', 'death_reporting');
        chai.expect(info.transitions.death_reporting.seq).not.to.equal(info.transitions.registration.seq);
        chai.expect(info.transitions.update_clinics.seq).to.equal(info.transitions.registration.seq);
        chai.expect(info.transitions.update_clinics.seq).to.equal(null);
      })
      .then(() => utils.getDoc(docId))
      .then(updated => {
        chai.expect(updated.patient_id).to.be.ok;

        const opts = {
          qs: {
            key: JSON.stringify(['shortcode', updated.patient_id]),
            include_docs: true,
          },
          path: '/_design/medic-client/_view/contacts_by_reference',
        };
        return utils.requestOnTestDb(opts);
      })
      .then(result => {
        chai.expect(result.rows.length).to.equal(1);
        chai.expect(result.rows[0].doc).to.deep.include({
          parent: { _id: 'clinic1', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } },
          date_of_death: '123456789',
          name: 'Veronica',
        });
      });
  });

  it('should only run one shortcode generating transition', () => {
    const settings = {
      transitions: {
        generate_patient_id_on_people: true,
        generate_shortcode_on_contacts: true,
      },
    };

    const place = {
      _id: 'my_favorite_place',
      name: 'My Favorite Place',
      type: 'health_center',
      reported_date: new Date().getTime(),
      parent: { _id: 'district_hospital' },
    };

    const person = {
      _id: 'my_favorite_person',
      name: 'My Favorite Person',
      type: 'person',
      reported_date: new Date().getTime(),
      parent: { _id: 'my_favorite_place', parent: { _id: 'district_hospital' } },
    };

    return utils
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDocs([place, person]))
      .then(() => sentinelUtils.waitForSentinel([ place._id, person._id ]))
      .then(() => sentinelUtils.getInfoDocs([ place._id, person._id ]))
      .then(([ placeInfo, personInfo ]) => {
        expectTransitions(placeInfo, 'generate_shortcode_on_contacts');
        expectTransitions(personInfo, 'generate_shortcode_on_contacts');
      })
      .then(() => utils.getDocs([ place._id, person._id ]))
      .then(([ updatedPlace, updatedPerson ]) => {
        chai.expect(updatedPlace.place_id).to.be.ok;
        chai.expect(updatedPerson.patient_id).to.be.ok;
      });
  });

  it('calling getDeprecatedTransitions endpoint does not break API transitions', () => {
    const settings = {
      transitions: { death_reporting: true, update_clinics: true },
      death_reporting: {
        mark_deceased_forms: ['DR'],
        date_field: 'fields.time_of_death'
      },
      forms: {
        DR: {
          meta: {
            code: 'DR',
            icon: 'icon-death-general',
            translation_key: 'form.dr.title'
          },
          fields: {
            patient_id: {
              labels: { short: { translation_key: 'patient_id' } },
              position: 0,
              type: 'string',
              required: true
            }
          },
        },
      },
    };

    const person1 = {
      _id: 'a_person',
      name: 'My Favorite Person',
      type: 'person',
      reported_date: new Date().getTime(),
      patient_id: 'a_person',
      parent: { _id: 'district_hospital' },
    };

    const person2 = {
      _id: 'another_person',
      name: 'My Favorite Person',
      type: 'person',
      reported_date: new Date().getTime(),
      patient_id: 'another_person',
      parent: { _id: 'district_hospital' },
    };

    const recordsBody = (person) => ({ _meta: { form: 'DR', from: 'phone1' }, patient_id: person.patient_id });

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDocs([person1, person2]))
      .then(() => sentinelUtils.waitForSentinel())
      .then(() => utils.request({ path: '/api/v2/records', method: 'POST', body: recordsBody(person1) }))
      .then(response => {
        chai.expect(response.success).to.equal(true);
        return sentinelUtils.getInfoDocs(response.id);
      })
      .then(([infodoc]) => {
        expectTransitions(infodoc, 'death_reporting', 'update_clinics');
      })
      .then(() => utils.request({ path: '/api/v1/settings/deprecated-transitions' }))
      .then(() => utils.request({ path: '/api/v2/records', method: 'POST', body: recordsBody(person2) }))
      .then(response => {
        chai.expect(response.success).to.equal(true);
        return sentinelUtils.getInfoDocs(response.id);
      })
      .then(([infodoc]) => {
        expectTransitions(infodoc, 'death_reporting', 'update_clinics');
      });
  });
});
