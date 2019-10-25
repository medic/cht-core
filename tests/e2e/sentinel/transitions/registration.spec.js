const utils = require('../../../utils'),
      sentinelUtils = require('../utils'),
      uuid = require('uuid'),
      moment = require('moment');

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
    patient_id: 'patient',
    parent: { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } },
    phone: '+444999',
    reported_date: new Date().getTime()
  }
];

describe('registration', () => {
  beforeAll(done => utils.saveDocs(contacts).then(done));
  afterAll(done => utils.revertDb().then(done));
  afterEach(done => utils.revertDb(contacts.map(c => c._id), true).then(done));

  it('should be skipped when transition is disabled', () => {
    const settings = {
      transitions: { registration: false },
      registrations: [{
        form: 'FORM',
        events: [],
        messages: [{
          recipient: 'reporting_unit',
          event_type: 'report_accepted',
          message: [{
            locale: 'en',
            content: 'Report accepted'
          }],
        }]
      }],
      forms: { FORM: { }}
    };

    const doc = {
      _id: uuid(),
      type: 'data_record',
      form: 'FORM',
      reported_date: moment().valueOf(),
      contact: { _id: 'person', parent:  { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } } }
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

  it('should be skipped if no config', () => {
    const settings = {
      transitions: { registration: true },
      registrations: [{
        form: 'FORM',
        events: [],
        messages: [{
          recipient: 'reporting_unit',
          event_type: 'report_accepted',
          message: [{
            locale: 'en',
            content: 'Report accepted'
          }],
        }]
      }],
      forms: { FORM: { }}
    };

    const doc = {
      _id: uuid(),
      type: 'data_record',
      form: 'NOT_FORM',
      reported_date: moment().valueOf(),
      contact: { _id: 'person', parent:  { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } } }
    };

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        expect(Object.keys(info.transitions).length).toEqual(0);
      })
      .then(() => utils.getDoc(doc._id))
      .then(updated => {
        expect(updated.tasks).not.toBeDefined();
      });
  });

  it('should error if invalid or if patient not found', () => {
    const settings = {
      transitions: { registration: true },
      registrations: [{
        form: 'FORM',
        events: [],
        messages: [{
          recipient: 'reporting_unit',
          event_type: 'report_accepted',
          message: [{
            locale: 'en',
            content: 'Report accepted'
          }],
        }, {
          event_type: 'registration_not_found',
          message: [{
            locale: 'en',
            content: 'Patient not found'
          }],
        }],
        validations: {
          list: [{
            property: 'count',
            rule: 'min(10)',
            message: [{
              locale: 'en',
              content: 'Count is incorrect'
            }],
          }]
        }
      }],
      forms: { FORM: { }}
    };

    const doc1 = {
      _id: uuid(),
      type: 'data_record',
      from: '+444999',
      form: 'FORM',
      fields: {
        count: 3
      },
      reported_date: moment().valueOf(),
      contact: { _id: 'person', parent:  { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } } }
    };

    const doc2 = {
      _id: uuid(),
      type: 'data_record',
      form: 'FORM',
      from: '+444999',
      fields: {
        patient_id: 'non_existent',
        count: 22
      },
      reported_date: moment().valueOf(),
      contact: { _id: 'person', parent:  { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } } }
    };

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDocs([ doc1, doc2 ]))
      .then(() => sentinelUtils.waitForSentinel([doc1._id, doc2._id]))
      .then(() => sentinelUtils.getInfoDocs([doc1._id, doc2._id]))
      .then(infos => {
        expect(infos[0].transitions).toBeDefined();
        expect(infos[0].transitions.registration).toBeDefined();
        expect(infos[0].transitions.registration.ok).toEqual(true);

        expect(infos[1].transitions).toBeDefined();
        expect(infos[1].transitions.registration).toBeDefined();
        expect(infos[1].transitions.registration.ok).toEqual(true);
      })
      .then(() => utils.getDocs([doc1._id, doc2._id]))
      .then(updated => {
        expect(updated[0].tasks).toBeDefined();
        expect(updated[0].tasks.length).toEqual(1);
        expect(updated[0].tasks[0].messages[0].message).toEqual('Count is incorrect');
        expect(updated[0].tasks[0].messages[0].to).toEqual('+444999');

        expect(updated[0].errors).toBeDefined();
        expect(updated[0].errors.length).toEqual(1);
        expect(updated[0].errors[0].message).toEqual('Count is incorrect');

        expect(updated[1].tasks).toBeDefined();
        expect(updated[1].tasks.length).toEqual(1);
        expect(updated[1].tasks[0].messages[0].message).toEqual('Patient not found');
        expect(updated[1].tasks[0].messages[0].to).toEqual('+444999');

        expect(updated[1].errors).toBeDefined();
        expect(updated[1].errors.length).toEqual(1);
        expect(updated[1].errors[0].code).toEqual('registration_not_found');
      });
  });

  it('should create a patient with a random patient_id or prefilled value', () => {
    const settings = {
      transitions: { registration: true },
      registrations: [{
        form: 'FORM-A',
        events: [{
          name: 'on_create',
          trigger: 'add_patient',
          params: '',
          bool_expr: ''
        }],
        messages: [],
      }, {
        form: 'FORM-B',
        events: [{
          name: 'on_create',
          trigger: 'add_patient',
          params: { patient_id_field: 'our_patient_id', patient_name_field: 'our_patient_name' },
          bool_expr: ''
        }],
        messages: [],
      }],
      forms: { 'FORM-A': { }, 'FORM-B': { }}
    };

    const doc1 = {
      _id: uuid(),
      type: 'data_record',
      form: 'FORM-A',
      from: '+444999',
      fields: {
        patient_name: 'Minerva',
      },
      reported_date: moment().valueOf(),
      contact: { _id: 'person', parent:  { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } } }
    };

    const doc2 = {
      _id: uuid(),
      type: 'data_record',
      form: 'FORM-A',
      from: '+444999',
      fields: {
        patient_id: 'person',
        patient_name: 'Mike',
      },
      reported_date: moment().valueOf(),
      contact: { _id: 'person', parent:  { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } } }
    };

    const doc3 = {
      _id: uuid(),
      type: 'data_record',
      form: 'FORM-B',
      from: '+444999',
      fields: {
        our_patient_name: 'Venus',
        our_patient_id: 'venus'
      },
      reported_date: moment().valueOf(),
      contact: { _id: 'person', parent:  { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } } }
    };

    const doc4 = {
      _id: uuid(),
      type: 'data_record',
      form: 'FORM-B',
      from: '+444999',
      fields: {
        patient_name: 'Ceres',
        our_patient_id: 'patient'
      },
      reported_date: moment().valueOf(),
      contact: { _id: 'person', parent:  { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } } }
    };

    let newPatientId;

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDocs([ doc1, doc2, doc3, doc4 ]))
      .then(() => sentinelUtils.waitForSentinel([doc1._id, doc2._id, doc3._id, doc4._id]))
      .then(() => sentinelUtils.getInfoDocs([doc1._id, doc2._id, doc3._id, doc4._id]))
      .then(infos => {
        expect(infos[0].transitions).toBeDefined();
        expect(infos[0].transitions.registration).toBeDefined();
        expect(infos[0].transitions.registration.ok).toEqual(true);

        expect(infos[1].transitions).toBeDefined();
        expect(infos[1].transitions.registration).toBeDefined();
        expect(infos[1].transitions.registration.ok).toEqual(true);

        expect(infos[2].transitions).toBeDefined();
        expect(infos[2].transitions.registration).toBeDefined();
        expect(infos[2].transitions.registration.ok).toEqual(true);

        expect(infos[3].transitions).toBeDefined();
        expect(infos[3].transitions.registration).toBeDefined();
        expect(infos[3].transitions.registration.ok).toEqual(true);
      })
      .then(() => utils.getDocs([doc1._id, doc2._id, doc3._id, doc4._id]))
      .then(updated => {
        expect(updated[0].patient_id).toBeDefined();
        newPatientId = updated[0].patient_id;

        expect(updated[1].patient_id).not.toBeDefined();
        expect(updated[1].fields.patient_id).toEqual('person');
        expect(updated[1].errors).toBeDefined();
        expect(updated[1].errors.length).toEqual(1);
        expect(updated[1].errors[0].code).toEqual('registration_not_found');

        expect(updated[2].patient_id).toEqual('venus');

        expect(updated[3].patient_id).not.toBeDefined();
        expect(updated[3].errors).toBeDefined();
        expect(updated[3].errors.length).toEqual(1);
        expect(updated[3].errors[0].code).toEqual('provided_patient_id_not_unique');

        const keys = [
          ['shortcode', newPatientId],
          ['shortcode', 'venus']
        ];

        return utils.requestOnTestDb(
          `/_design/medic-client/_view/contacts_by_reference?keys=${JSON.stringify(keys)}&include_docs=true`
        );
      })
      .then(patients => {
        expect(patients.rows.length).toEqual(2);

        expect(patients.rows[0].doc.patient_id).toEqual(newPatientId);
        expect(patients.rows[0].doc.parent._id).toEqual('clinic');
        expect(patients.rows[0].doc.name).toEqual('Minerva');
        expect(patients.rows[0].doc.type).toEqual('person');

        expect(patients.rows[1].doc.patient_id).toEqual('venus');
        expect(patients.rows[1].doc.parent._id).toEqual('clinic');
        expect(patients.rows[1].doc.name).toEqual('Venus');
        expect(patients.rows[1].doc.type).toEqual('person');
      });
  });

  it('should add expected date', () => {
    const settings = {
      transitions: { registration: true },
      registrations: [{
        form: 'FORM',
        events: [{
          name: 'on_create',
          trigger: 'add_expected_date',
          params: '',
          bool_expr: ''
        }],
        messages: [],
      }],
      forms: { FORM: { }}
    };

    const doc1 = {
      _id: uuid(),
      type: 'data_record',
      form: 'FORM',
      from: '+444999',
      fields: {
        patient_id: 'patient',
        weeks_since_lmp: 2,
      },
      reported_date: moment().valueOf(),
      contact: { _id: 'person', parent:  { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } } }
    };

    const doc2 = {
      _id: uuid(),
      type: 'data_record',
      form: 'FORM',
      from: '+444999',
      fields: {
        patient_id: 'patient',
        last_menstrual_period: 2
      },
      reported_date: moment().subtract(2, 'weeks').valueOf(),
      contact: { _id: 'person', parent:  { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } } }
    };

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDocs([ doc1, doc2 ]))
      .then(() => sentinelUtils.waitForSentinel([doc1._id, doc2._id]))
      .then(() => sentinelUtils.getInfoDocs([doc1._id, doc2._id]))
      .then(infos => {
        expect(infos[0].transitions).toBeDefined();
        expect(infos[0].transitions.registration).toBeDefined();
        expect(infos[0].transitions.registration.ok).toEqual(true);

        expect(infos[1].transitions).toBeDefined();
        expect(infos[1].transitions.registration).toBeDefined();
        expect(infos[1].transitions.registration.ok).toEqual(true);
      })
      .then(() => utils.getDocs([doc1._id, doc2._id]))
      .then(updated => {
        expect(updated[0].lmp_date).toBeDefined();
        expect(updated[0].lmp_date).toEqual(moment().utc(false).startOf('day').subtract(2, 'weeks').toISOString());
        expect(updated[0].expected_date).toEqual(moment().utc(false).startOf('day').add(38, 'weeks').toISOString());

        expect(updated[1].lmp_date).toBeDefined();
        expect(updated[1].lmp_date).toEqual(moment().utc(false).startOf('day').subtract(4, 'weeks').toISOString());
        expect(updated[1].expected_date).toEqual(moment().utc(false).startOf('day').add(36, 'weeks').toISOString());
      });
  });

  it('should add birth date', () => {
    const settings = {
      transitions: { registration: true },
      registrations: [{
        form: 'FORM',
        events: [{
          name: 'on_create',
          trigger: 'add_birth_date',
          params: '',
          bool_expr: ''
        }],
        messages: [],
      }],
      forms: { FORM: { }}
    };

    const doc1 = {
      _id: uuid(),
      type: 'data_record',
      form: 'FORM',
      from: '+444999',
      fields: {
        patient_id: 'patient',
        months_since_birth: 2,
      },
      reported_date: moment().valueOf(),
      contact: { _id: 'person', parent:  { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } } }
    };

    const doc2 = {
      _id: uuid(),
      type: 'data_record',
      form: 'FORM',
      from: '+444999',
      fields: {
        patient_id: 'patient',
        weeks_since_birth: 2
      },
      reported_date: moment().subtract(2, 'weeks').valueOf(),
      contact: { _id: 'person', parent:  { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } } }
    };

    const doc3 = {
      _id: uuid(),
      type: 'data_record',
      form: 'FORM',
      from: '+444999',
      fields: {
        patient_id: 'patient',
        age_in_years: 2
      },
      reported_date: moment().valueOf(),
      contact: { _id: 'person', parent:  { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } } }
    };

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDocs([ doc1, doc2, doc3 ]))
      .then(() => sentinelUtils.waitForSentinel([doc1._id, doc2._id, doc3._id]))
      .then(() => sentinelUtils.getInfoDocs([doc1._id, doc2._id, doc3._id]))
      .then(infos => {
        expect(infos[0].transitions).toBeDefined();
        expect(infos[0].transitions.registration).toBeDefined();
        expect(infos[0].transitions.registration.ok).toEqual(true);

        expect(infos[1].transitions).toBeDefined();
        expect(infos[1].transitions.registration).toBeDefined();
        expect(infos[1].transitions.registration.ok).toEqual(true);

        expect(infos[2].transitions).toBeDefined();
        expect(infos[2].transitions.registration).toBeDefined();
        expect(infos[2].transitions.registration.ok).toEqual(true);
      })
      .then(() => utils.getDocs([doc1._id, doc2._id, doc3._id]))
      .then(updated => {
        expect(updated[0].birth_date).toEqual(moment().utc(false).startOf('day').subtract(2, 'months').toISOString());
        expect(updated[1].birth_date).toEqual(moment().utc(false).startOf('day').subtract(4, 'weeks').toISOString());
        expect(updated[2].birth_date).toEqual(moment().utc(false).startOf('day').subtract(2, 'years').toISOString());
      });
  });

  it('should assign and clear schedules', () => {
    const settings = {
      transitions: { registration: true },
      registrations: [{
        form: 'FORM',
        events: [{
          name: 'on_create',
          trigger: 'assign_schedule',
          params: ['sch1', 'sch2'],
          bool_expr: ''
        }, {
          name: 'on_create',
          trigger: 'clear_schedule',
          params: ['sch1', 'sch2'],
          bool_expr: ''
        }],
        messages: [],
      }],
      forms: { FORM: { }},
      schedules: [{
        name: 'sch1',
        start_from: 'some_date_field',
        messages: [{
          // this is in the past
          group: 1,
          offset: '5 days',
          send_day: 'monday',
          send_time: '09:00',
          recipient: 'clinic',
          message: [{
            locale: 'en',
            content: 'message1'
          }],
        }, {
          group: 2,
          offset: '12 weeks',
          send_day: '',
          send_time: '',
          recipient: 'clinic',
          message: [{
            locale: 'en',
            content: 'message2'
          }],
        }]
      }, {
        name: 'sch2',
        start_from: 'reported_date',
        messages: [{
          group: 1,
          offset: '2 weeks',
          send_day: 'friday',
          send_time: '09:00',
          recipient: 'clinic',
          message: [{
            locale: 'en',
            content: 'message3'
          }],
        }, {
          group: 1,
          offset: '5 years',
          send_day: '',
          send_time: '',
          recipient: 'clinic',
          message: [{
            locale: 'en',
            content: 'message4'
          }],
        }]
      }]
    };

    const doc1 = {
      _id: uuid(),
      type: 'data_record',
      form: 'FORM',
      from: '+444999',
      fields: {
        patient_id: 'patient',
      },
      some_date_field: moment().subtract(3, 'week').valueOf(),
      reported_date: moment().valueOf(),
      contact: { _id: 'person', parent:  { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } } }
    };

    const doc2 = {
      _id: uuid(),
      type: 'data_record',
      form: 'FORM',
      from: '+444999',
      fields: {
        patient_id: 'patient',
      },
      some_date_field: moment().subtract(2, 'week').valueOf(),
      reported_date: moment().valueOf(),
      contact: { _id: 'person', parent:  { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } } }
    };

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDoc(doc1))
      .then(() => sentinelUtils.waitForSentinel(doc1._id))
      .then(() => sentinelUtils.getInfoDoc(doc1._id))
      .then(info => {
        expect(info.transitions).toBeDefined();
        expect(info.transitions.registration).toBeDefined();
        expect(info.transitions.registration.ok).toEqual(true);
      })
      .then(() => utils.getDoc(doc1._id))
      .then(updated => {
        expect(updated.scheduled_tasks).toBeDefined();
        expect(updated.scheduled_tasks.length).toEqual(3);

        expect(updated.scheduled_tasks[0].type).toEqual('sch1');
        expect(updated.scheduled_tasks[0].group).toEqual(2);
        expect(updated.scheduled_tasks[0].state).toEqual('scheduled');
        expect(updated.scheduled_tasks[0].messages[0].message).toEqual('message2');

        expect(updated.scheduled_tasks[1].type).toEqual('sch2');
        expect(updated.scheduled_tasks[1].group).toEqual(1);
        expect(updated.scheduled_tasks[1].state).toEqual('scheduled');
        expect(updated.scheduled_tasks[1].messages[0].message).toEqual('message3');

        expect(updated.scheduled_tasks[2].type).toEqual('sch2');
        expect(updated.scheduled_tasks[2].group).toEqual(1);
        expect(updated.scheduled_tasks[2].state).toEqual('scheduled');
        expect(updated.scheduled_tasks[2].messages[0].message).toEqual('message4');
      })
      .then(() => utils.saveDoc(doc2))
      .then(() => sentinelUtils.waitForSentinel(doc2._id))
      .then(() => sentinelUtils.getInfoDoc(doc2._id))
      .then(info => {
        expect(info.transitions).toBeDefined();
        expect(info.transitions.registration).toBeDefined();
        expect(info.transitions.registration.ok).toEqual(true);
      })
      .then(() => utils.getDocs([doc1._id, doc2._id ]))
      .then(updated => {
        //1st doc has cleared schedules
        expect(updated[0].scheduled_tasks).toBeDefined();
        expect(updated[0].scheduled_tasks.length).toEqual(3);
        expect(updated[0].scheduled_tasks.every(task => task.state === 'cleared')).toBe(true);

        //2nd doc has schedules
        expect(updated[1].scheduled_tasks).toBeDefined();
        expect(updated[1].scheduled_tasks.length).toEqual(3);

        expect(updated[1].scheduled_tasks[0].type).toEqual('sch1');
        expect(updated[1].scheduled_tasks[0].group).toEqual(2);
        expect(updated[1].scheduled_tasks[0].state).toEqual('scheduled');
        expect(updated[1].scheduled_tasks[0].messages[0].message).toEqual('message2');

        expect(updated[1].scheduled_tasks[1].type).toEqual('sch2');
        expect(updated[1].scheduled_tasks[1].group).toEqual(1);
        expect(updated[1].scheduled_tasks[1].state).toEqual('scheduled');
        expect(updated[1].scheduled_tasks[1].messages[0].message).toEqual('message3');

        expect(updated[1].scheduled_tasks[2].type).toEqual('sch2');
        expect(updated[1].scheduled_tasks[2].group).toEqual(1);
        expect(updated[1].scheduled_tasks[2].state).toEqual('scheduled');
        expect(updated[1].scheduled_tasks[2].messages[0].message).toEqual('message4');
      });
  });

  it('should add messages', () => {
    const settings = {
      transitions: { registration: true },
      registrations: [{
        form: 'FORM',
        events: [],
        messages: [{
          recipient: 'reporting_unit',
          event_type: 'report_accepted',
          message: [{
            locale: 'en',
            content: 'Report accepted'
          }],
        }, {
          recipient: 'clinic',
          bool_expr: '',
          message: [{
            locale: 'en',
            content: 'alpha'
          }],
        }, {
          recipient: 'clinic',
          bool_expr: 'doc.random_field > 0',
          message: [{
            locale: 'en',
            content: 'beta'
          }],
        }, {
          recipient: 'clinic',
          bool_expr: 'doc.random_field > 100',
          message: [{
            locale: 'en',
            content: 'gamma'
          }],
        }],
      }],
      forms: { FORM: { }},
    };

    const doc = {
      _id: uuid(),
      type: 'data_record',
      form: 'FORM',
      from: '+444999',
      random_field: 20,
      fields: {
        patient_id: 'patient',
      },
      some_date_field: moment().subtract(3, 'week').valueOf(),
      reported_date: moment().valueOf(),
      contact: { _id: 'person', parent:  { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } } }
    };

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        expect(info.transitions).toBeDefined();
        expect(info.transitions.registration).toBeDefined();
        expect(info.transitions.registration.ok).toEqual(true);
      })
      .then(() => utils.getDoc(doc._id))
      .then(updated => {
        expect(updated.tasks).toBeDefined();
        expect(updated.tasks.length).toEqual(3);

        expect(updated.tasks[0].messages[0].message).toEqual('Report accepted');
        expect(updated.tasks[1].messages[0].message).toEqual('alpha');
        expect(updated.tasks[2].messages[0].message).toEqual('beta');
      });

  });
});
