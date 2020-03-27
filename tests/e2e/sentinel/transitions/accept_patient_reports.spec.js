const utils = require('../../../utils');
const sentinelUtils = require('../utils');
const uuid = require('uuid');


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
      parent:  { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
    },
    reported_date: new Date().getTime()
  },
  {
    _id: 'person',
    name: 'Person',
    type: 'person',
    patient_id: 'patient',
    parent: { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } },
    phone: '+phone',
    reported_date: new Date().getTime()
  },
  {
    _id: 'person2',
    name: 'Person',
    type: 'person',
    patient_id: 'patient2',
    parent: { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } },
    phone: '+phone2',
    reported_date: new Date().getTime()
  }
];

describe('accept_patient_reports', () => {
  beforeAll(done => utils.saveDocs(contacts).then(done));
  afterAll(done => utils.revertDb().then(done));
  afterEach(done => utils.revertDb(contacts.map(c => c._id), true).then(done));

  it('should be skipped when transition is disabled', () => {
    const settings = {
      transitions: { accept_patient_reports: false },
      patient_reports: [{ form: 'FORM' }],
      forms: { FORM: { } }
    };

    const doc = {
      _id: uuid(),
      form: 'FORM',
      type: 'data_record',
      reported_date: new Date().getTime(),
      from: '+phone',
      contact: {
        _id: 'person',
        parent: { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
      }
    };

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        expect(Object.keys(info.transitions).length).toEqual(0);
      });
  });

  it('should be skipped when no matching config', () => {
    const settings = {
      transitions: { accept_patient_reports: false },
      patient_reports: [{ form: 'FORM' }],
      forms: { NOT_FORM: { } }
    };

    const doc = {
      _id: uuid(),
      form: 'NOT_FORM',
      type: 'data_record',
      reported_date: new Date().getTime(),
      from: '+phone',
      contact: {
        _id: 'person',
        parent: { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
      }
    };

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        expect(Object.keys(info.transitions).length).toEqual(0);
      });
  });

  it('should add errors when patient not found or validation does not pass', () => {
    const settings = {
      transitions: { accept_patient_reports: true },
      patient_reports: [
        {
          form: 'FORM',
          validations: {
            list: [
              {
                property: 'patient_id',
                rule: 'lenMin(5) && lenMax(10)',
                message: [{
                  locale: 'en',
                  content: 'Patient id incorrect'
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
          }]
        }
      ],
      forms: { FORM: { } }
    };

    const doc1 = {
      _id: uuid(),
      type: 'data_record',
      form: 'FORM',
      from: '+phone',
      fields: {
        patient_id: 'unknown'
      },
      reported_date: new Date().getTime(),
      contact: {
        _id: 'person',
        parent: { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
      }
    };

    const doc2 = {
      _id: uuid(),
      type: 'data_record',
      form: 'FORM',
      from: '+phone',
      fields: {
        patient_id: 'this will not match the validation rule'
      },
      reported_date: new Date().getTime(),
      contact: {
        _id: 'person',
        parent: { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
      }
    };

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDocs([doc1, doc2]))
      .then(() => sentinelUtils.waitForSentinel([doc1._id, doc2._id]))
      .then(() => sentinelUtils.getInfoDocs([doc1._id, doc2._id]))
      .then(infos => {
        expect(infos[0].transitions).toBeDefined();
        expect(infos[0].transitions.accept_patient_reports).toBeDefined();
        expect(infos[0].transitions.accept_patient_reports.ok).toBe(true);

        expect(infos[1].transitions).toBeDefined();
        expect(infos[1].transitions.accept_patient_reports).toBeDefined();
        expect(infos[1].transitions.accept_patient_reports.ok).toBe(true);
      })
      .then(() => utils.getDocs([doc1._id, doc2._id]))
      .then(updated => {
        expect(updated[0].tasks).toBeDefined();
        expect(updated[0].tasks.length).toEqual(1);
        expect(updated[0].tasks[0].messages[0].message).toEqual('Patient not found');
        expect(updated[0].tasks[0].messages[0].to).toEqual('+phone');
        expect(updated[0].tasks[0].state).toEqual('pending');

        expect(updated[0].errors).toBeDefined();
        expect(updated[0].errors.length).toEqual(1);
        expect(updated[0].errors[0].code).toEqual('registration_not_found');

        expect(updated[1].tasks).toBeDefined();
        expect(updated[1].tasks.length).toEqual(1);
        expect(updated[1].tasks[0].messages[0].message).toEqual('Patient id incorrect');
        expect(updated[1].tasks[0].messages[0].to).toEqual('+phone');
        expect(updated[1].tasks[0].state).toEqual('pending');

        expect(updated[1].errors).toBeDefined();
        expect(updated[1].errors.length).toEqual(1);
        expect(updated[1].errors[0].message).toEqual('Patient id incorrect');
      });
  });

  it('should add relevant messages', () => {
    const settings = {
      transitions: { accept_patient_reports: true },
      patient_reports: [
        {
          form: 'FORM',
          messages: [
            {
              event_type: 'registration_not_found',
              message: [{
                locale: 'en',
                content: 'Patient not found'
              }],
            },
            {
              event_type: 'report_accepted',
              recipient: 'reporting_unit',
              message: [{
                locale: 'en',
                content: 'message_1'
              }],
            },
            {
              event_type: 'report_accepted',
              recipient: 'reporting_unit',
              bool_expr: 'doc.type === "data_record"',
              message: [{
                locale: 'en',
                content: 'message_2'
              }],
            },
            {
              event_type: 'report_accepted',
              recipient: 'reporting_unit',
              bool_expr: 'doc.fields.something === true',
              message: [{
                locale: 'en',
                content: 'message_3'
              }],
            }
          ]
        }
      ],
      forms: { FORM: { } }
    };

    const doc1 = {
      _id: uuid(),
      type: 'data_record',
      form: 'FORM',
      from: '+phone',
      fields: {
        patient_id: 'patient'
      },
      reported_date: new Date().getTime(),
      contact: {
        _id: 'person',
        parent: { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
      }
    };

    const doc2 = {
      _id: uuid(),
      type: 'data_record',
      form: 'FORM',
      from: '+phone2',
      fields: {
        patient_id: 'patient2',
        something: true
      },
      reported_date: new Date().getTime(),
      contact: {
        _id: 'person2',
        parent: { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
      }
    };

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDocs([doc1, doc2]))
      .then(() => sentinelUtils.waitForSentinel([doc1._id, doc2._id]))
      .then(() => sentinelUtils.getInfoDocs([doc1._id, doc2._id]))
      .then(infos => {
        expect(infos[0].transitions).toBeDefined();
        expect(infos[0].transitions.accept_patient_reports).toBeDefined();
        expect(infos[0].transitions.accept_patient_reports.ok).toBe(true);

        expect(infos[1].transitions).toBeDefined();
        expect(infos[1].transitions.accept_patient_reports).toBeDefined();
        expect(infos[1].transitions.accept_patient_reports.ok).toBe(true);
      })
      .then(() => utils.getDocs([doc1._id, doc2._id]))
      .then(updated => {
        expect(updated[0].tasks).toBeDefined();
        expect(updated[0].tasks.length).toEqual(2);

        expect(updated[0].tasks[0].messages[0].message).toEqual('message_1');
        expect(updated[0].tasks[0].messages[0].to).toEqual('+phone');
        expect(updated[0].tasks[0].state).toEqual('pending');

        expect(updated[0].tasks[1].messages[0].message).toEqual('message_2');
        expect(updated[0].tasks[1].messages[0].to).toEqual('+phone');
        expect(updated[0].tasks[1].state).toEqual('pending');

        expect(updated[0].errors).not.toBeDefined();
        expect(updated[0].registration_id).not.toBeDefined();

        expect(updated[1].tasks).toBeDefined();
        expect(updated[1].tasks.length).toEqual(3);

        expect(updated[1].tasks[0].messages[0].message).toEqual('message_1');
        expect(updated[1].tasks[0].messages[0].to).toEqual('+phone2');
        expect(updated[1].tasks[0].state).toEqual('pending');

        expect(updated[1].tasks[1].messages[0].message).toEqual('message_2');
        expect(updated[1].tasks[1].messages[0].to).toEqual('+phone2');
        expect(updated[1].tasks[1].state).toEqual('pending');

        expect(updated[1].tasks[2].messages[0].message).toEqual('message_3');
        expect(updated[1].tasks[2].messages[0].to).toEqual('+phone2');
        expect(updated[1].tasks[2].state).toEqual('pending');

        expect(updated[1].errors).not.toBeDefined();
        expect(updated[1].registration_id).not.toBeDefined();
      });
  });

  it('should add registration to doc', () => {
    const settings = {
      transitions: { accept_patient_reports: true },
      patient_reports: [{ form: 'FORM', messages: [] }],
      registrations: [{ form: 'xml_form' }, { form: 'sms_form_1' }, { form: 'sms_form_2' }],
      forms: { sms_form_1: { }, sms_form_2: { }, FORM: { } }
    };

    const reports = [
      { // not a registration
        _id: 'no_registration_config',
        type: 'data_record',
        content_type: 'xml',
        form: 'test_form',
        fields: {
          patient_id: 'patient'
        },
        reported_date: new Date().getTime(),
        contact: {
          _id: 'person',
          parent: { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
        }
      },
      { // not a registration
        _id: 'incorrect_content',
        type: 'data_record',
        form: 'xml_form',
        fields: {
          patient_id: 'patient'
        },
        reported_date: new Date().getTime() + 5000
      },
      { // not a registration
        _id: 'sms_without_contact',
        type: 'data_record',
        form: 'sms_form_2',
        fields: {
          patient_id: 'person'
        },
        reported_date: new Date().getTime() + 6000
      },
      { // valid registration
        _id: 'registration_1',
        type: 'data_record',
        content_type: 'xml',
        form: 'xml_form',
        fields: {
          patient_id: 'patient'
        },
        reported_date: new Date().getTime() + 1000
      },
      { // valid registration
        _id: 'registration_2',
        type: 'data_record',
        form: 'sms_form_1',
        fields: {
          patient_id: 'patient'
        },
        reported_date: new Date().getTime() + 3000,
        contact: {
          _id: 'person',
          parent: { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
        }
      },
      { // valid registration
        _id: 'registration_3',
        type: 'data_record',
        form: 'sms_form_2',
        fields: {
          patient_id: 'patient'
        },
        contact: { _id: 'person' },
        reported_date: new Date().getTime(),
      },
      { // valid registration for other patient
        _id: 'registration_4',
        type: 'data_record',
        form: 'sms_form_2',
        fields: {
          patient_id: 'patient2'
        },
        contact: { _id: 'person2' },
        reported_date: new Date().getTime() + 1000,
      }
    ];

    const doc = {
      _id: uuid(),
      type: 'data_record',
      form: 'FORM',
      from: 'phone2',
      fields: {
        patient_id: 'patient',
      },
      reported_date: new Date().getTime(),
      contact: {
        _id: 'person',
        parent: { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
      }
    };

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDocs(reports))
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        expect(info.transitions).toBeDefined();
        expect(info.transitions.accept_patient_reports).toBeDefined();
        expect(info.transitions.accept_patient_reports.ok).toBe(true);
      })
      .then(() => utils.getDoc(doc._id))
      .then(updated => {
        expect(updated.registration_id).toEqual('registration_2');
      });
  });

  it('should silence registrations', () => {
    const settings = {
      transitions: { accept_patient_reports: true },
      patient_reports: [
        {
          form: 'NO_SILENCE',
          messages: [],
          silence_for: '',
          silence_type: ''
        },
        {
          form: 'SILENCE1',
          messages: [],
          silence_for: '1 days',
          silence_type: 'type1,type2'
        },
        {
          form: 'SILENCE2',
          messages: [],
          silence_for: '',
          silence_type: 'type3'
        }
      ],
      registrations: [{ form: 'form_1' }, { form: 'form_2' }],
      forms: { form_1: { }, form_2: { }, SILENCE1: { } }
    };

    const oneDay = 24 * 60 * 60 * 1000;

    const registrations = [
      {
        _id: uuid(),
        form: 'form_1',
        fields: { patient_id: 'patient' },
        type: 'data_record',
        reported_date: new Date().getTime(),
        scheduled_tasks: [
          { id: 1, type: 'type0', state: 'scheduled', due: new Date().getTime() + 10 * oneDay },
          { id: 2, type: 'type1', state: 'pending', due: new Date().getTime() - 2 * oneDay },
          { id: 3, type: 'type2', state: 'scheduled', due: new Date().getTime() + 3 * oneDay },
          { id: 4, type: 'type2', state: 'sent', due: new Date().getTime() - 10 * oneDay },
          { id: 5, type: 'type3', state: 'muted', due: new Date().getTime() - 10 * oneDay },
        ],
        contact: {
          _id: 'person',
          parent: { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
        }
      },
      {
        _id: uuid(),
        form: 'form_2',
        fields: { patient_id: 'patient' },
        type: 'data_record',
        reported_date: new Date().getTime(),
        scheduled_tasks: [
          { id: 1, type: 'type0', group: 'a', state: 'scheduled', due: new Date().getTime() - 10 * oneDay },
          { id: 2, type: 'type1', group: 'a', state: 'pending', due: new Date().getTime() - 10 * oneDay },
          { id: 3, type: 'type1', group: 'a', state: 'scheduled', due: new Date().getTime() + 10 * oneDay },
          { id: 4, type: 'type2', group: 'a', state: 'scheduled', due: new Date().getTime() + 2 * oneDay },
          { id: 5, type: 'type2', group: 'a', state: 'pending', due: new Date().getTime() + 5 * oneDay },
          { id: 6, type: 'type2', group: 'a', state: 'delivered', due: new Date().getTime() - 5 * oneDay },

          { id: 1, type: 'type1', group: 'b', state: 'pending', due: new Date().getTime() + 10 * oneDay },
          { id: 2, type: 'type2', group: 'b', state: 'scheduled', due: new Date().getTime() - 20 * oneDay },
          { id: 3, type: 'type2', group: 'b', state: 'muted', due: new Date().getTime() + 2 * oneDay },
          { id: 4, type: 'type2', group: 'b', state: 'sent', due: new Date().getTime() - 20 * oneDay },
          { id: 5, type: 'type3', group: 'b', state: 'muted', due: new Date().getTime() + 1 * oneDay },
        ],
        contact: {
          _id: 'person',
          parent: { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
        }
      },
      {
        _id: uuid(),
        form: 'form_1',
        fields: { patient_id: 'patient2' },
        type: 'data_record',
        reported_date: new Date().getTime(),
        scheduled_tasks: [
          { id: 1, type: 'type0', state: 'scheduled', due: new Date().getTime() + 10 * oneDay },
          { id: 2, type: 'type1', state: 'pending', due: new Date().getTime() - 2 * oneDay },
          { id: 3, type: 'type3', state: 'muted', due: new Date().getTime() - 10 * oneDay },
          { id: 4, type: 'type3', state: 'pending', due: new Date().getTime() + 10 * oneDay },
          { id: 5, type: 'type3', state: 'sent', due: new Date().getTime() - 10 * oneDay },
        ],
        contact: {
          _id: 'person',
          parent: { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
        }
      },
      {
        _id: uuid(),
        form: 'form_2',
        fields: { patient_id: 'patient2' },
        type: 'data_record',
        reported_date: new Date().getTime(),
        scheduled_tasks: [
          { id: 1, type: 'type0', group: 'a', state: 'scheduled', due: new Date().getTime() - 10 * oneDay },
          { id: 2, type: 'type3', group: 'a', state: 'pending', due: new Date().getTime() - 10 * oneDay },
          { id: 3, type: 'type3', group: 'a', state: 'scheduled', due: new Date().getTime() + 10 * oneDay },

          { id: 1, type: 'type1', group: 'b', state: 'pending', due: new Date().getTime() + 10 * oneDay },
          { id: 2, type: 'type3', group: 'b', state: 'muted', due: new Date().getTime() + 2 * oneDay },
          { id: 3, type: 'type3', group: 'b', state: 'sent', due: new Date().getTime() + 1 * oneDay },
        ],
        contact: {
          _id: 'person',
          parent: { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
        }
      }
    ];

    const noSilence = {
      _id: uuid(),
      type: 'data_record',
      form: 'NO_SILENCE',
      from: 'phone',
      fields: {
        patient_id: 'patient',
      },
      reported_date: new Date().getTime(),
      content_type: 'xml'
    };

    const silence1 = {
      _id: uuid(),
      type: 'data_record',
      form: 'SILENCE1',
      from: '+phone',
      fields: {
        patient_id: 'patient',
      },
      reported_date: new Date().getTime(),
      contact: {
        _id: 'person',
        parent: { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
      }
    };

    const silence2 = {
      _id: uuid(),
      type: 'data_record',
      form: 'SILENCE2',
      from: 'phone',
      fields: {
        patient_id: 'patient2',
      },
      reported_date: new Date().getTime(),
      content_type: 'xml'
    };

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDocs(registrations))
      .then(() => utils.saveDoc(noSilence))
      .then(() => sentinelUtils.waitForSentinel(noSilence._id))
      .then(() => utils.getDocs(registrations.map(r => r._id)))
      .then(updated => {
        // none of the scheduled tasks should be cleared
        expect(updated.every(doc => !doc.scheduled_tasks.find(task => task.state === 'cleared'))).toBe(true);
      })
      .then(() => utils.saveDoc(silence1))
      .then(() => sentinelUtils.waitForSentinel(silence1._id))
      .then(() => utils.getDocs(registrations.map(r => r._id)))
      .then(updated => {
        expect(updated[0].scheduled_tasks.find(task => task.id === 1).state).toEqual('scheduled');
        expect(updated[0].scheduled_tasks.find(task => task.id === 2).state).toEqual('cleared');
        expect(updated[0].scheduled_tasks.find(task => task.id === 3).state).toEqual('cleared');
        expect(updated[0].scheduled_tasks.find(task => task.id === 4).state).toEqual('sent');
        expect(updated[0].scheduled_tasks.find(task => task.id === 5).state).toEqual('muted');

        expect(updated[1].scheduled_tasks.find(task => task.id === 1 && task.group === 'a').state).toEqual('scheduled');
        expect(updated[1].scheduled_tasks.find(task => task.id === 2 && task.group === 'a').state).toEqual('cleared');
        expect(updated[1].scheduled_tasks.find(task => task.id === 3 && task.group === 'a').state).toEqual('cleared');
        expect(updated[1].scheduled_tasks.find(task => task.id === 4 && task.group === 'a').state).toEqual('cleared');
        expect(updated[1].scheduled_tasks.find(task => task.id === 5 && task.group === 'a').state).toEqual('cleared');
        expect(updated[1].scheduled_tasks.find(task => task.id === 6 && task.group === 'a').state).toEqual('delivered');

        expect(updated[1].scheduled_tasks.find(task => task.id === 1 && task.group === 'b').state).toEqual('pending');
        expect(updated[1].scheduled_tasks.find(task => task.id === 2 && task.group === 'b').state).toEqual('cleared');
        expect(updated[1].scheduled_tasks.find(task => task.id === 3 && task.group === 'b').state).toEqual('cleared');
        expect(updated[1].scheduled_tasks.find(task => task.id === 4 && task.group === 'b').state).toEqual('sent');
        expect(updated[1].scheduled_tasks.find(task => task.id === 5 && task.group === 'b').state).toEqual('muted');

        expect(updated[2].scheduled_tasks).toEqual(registrations[2].scheduled_tasks);
        expect(updated[3].scheduled_tasks).toEqual(registrations[3].scheduled_tasks);
      })
      .then(() => utils.saveDoc(silence2))
      .then(() => sentinelUtils.waitForSentinel(silence2._id))
      .then(() => utils.getDocs(registrations.map(r => r._id)))
      .then(updated => {
        expect(updated[2].scheduled_tasks.find(task => task.id === 1).state).toEqual('scheduled');
        expect(updated[2].scheduled_tasks.find(task => task.id === 2).state).toEqual('pending');
        expect(updated[2].scheduled_tasks.find(task => task.id === 3).state).toEqual('cleared');
        expect(updated[2].scheduled_tasks.find(task => task.id === 4).state).toEqual('cleared');
        expect(updated[2].scheduled_tasks.find(task => task.id === 5).state).toEqual('sent');

        expect(updated[3].scheduled_tasks.find(task => task.id === 1 && task.group === 'a').state).toEqual('scheduled');
        expect(updated[3].scheduled_tasks.find(task => task.id === 2 && task.group === 'a').state).toEqual('cleared');
        expect(updated[3].scheduled_tasks.find(task => task.id === 3 && task.group === 'a').state).toEqual('cleared');

        expect(updated[3].scheduled_tasks.find(task => task.id === 1 && task.group === 'b').state).toEqual('pending');
        expect(updated[3].scheduled_tasks.find(task => task.id === 2 && task.group === 'b').state).toEqual('cleared');
        expect(updated[3].scheduled_tasks.find(task => task.id === 3 && task.group === 'b').state).toEqual('sent');
      });
  });
});
