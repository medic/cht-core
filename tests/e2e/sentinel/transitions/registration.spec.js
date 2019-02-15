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
  beforeEach(done => utils.saveDocs(contacts).then(done));
  afterAll(done => utils.revertDb().then(done));
  afterEach(done => utils.revertDb([], true).then(done));

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
      forms: { FORM: { public_form: true }}
    };

    const doc = {
      _id: uuid(),
      type: 'data_record',
      form: 'FORM',
      reported_date: moment().valueOf()
    };

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        expect(info.transitions).not.toBeDefined();
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
      forms: { FORM: { public_form: true }}
    };

    const doc = {
      _id: uuid(),
      type: 'data_record',
      form: 'NOT_FORM',
      reported_date: moment().valueOf()
    };

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        expect(info.transitions).not.toBeDefined();
      })
      .then(() => utils.getDoc(doc._id))
      .then(updated => {
        expect(updated.tasks).not.toBeDefined();
      })
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
      forms: { FORM: { public_form: true }}
    };

    const doc1 = {
      _id: uuid(),
      type: 'data_record',
      from: '12345',
      form: 'FORM',
      fields: {
        count: 3
      },
      reported_date: moment().valueOf()
    };

    const doc2 = {
      _id: uuid(),
      type: 'data_record',
      form: 'FORM',
      from: '12345',
      fields: {
        patient_id: 'non_existent',
        count: 22
      },
      reported_date: moment().valueOf()
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
        expect(updated[0].tasks[0].messages[0].to).toEqual('12345');

        expect(updated[0].errors).toBeDefined();
        expect(updated[0].errors.length).toEqual(1);
        expect(updated[0].errors[0].message).toEqual('Count is incorrect');

        expect(updated[1].tasks).toBeDefined();
        expect(updated[1].tasks.length).toEqual(1);
        expect(updated[1].tasks[0].messages[0].message).toEqual('Patient not found');
        expect(updated[1].tasks[0].messages[0].to).toEqual('12345');

        expect(updated[1].errors).toBeDefined();
        expect(updated[1].errors.length).toEqual(1);
        expect(updated[1].errors[0].code).toEqual('registration_not_found');
      });
  });

  it('should create a patient with a random patient_id', () => {
    const settings = {
      transitions: { registration: true },
      registrations: [{
        form: 'FORM',
        events: [{
          name: 'on_create',
          trigger: 'add_patient',
          params: '',
          bool_expr: ''
        }],
        messages: [],
      }],
      forms: { FORM: { public_form: true }}
    };

    const doc1 = {
      _id: uuid(),
      type: 'data_record',
      form: 'FORM',
      from: '+444999',
      fields: {
        patient_name: 'Minerva',
      },
      reported_date: moment().valueOf()
    };

    const doc2 = {
      _id: uuid(),
      type: 'data_record',
      form: 'FORM',
      from: '+444999',
      fields: {
        patient_id: 'person',
        patient_name: 'Mike',
      },
      reported_date: moment().valueOf()
    };

    let newPatientId;

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
        expect(updated[0].patient_id).toBeDefined();
        newPatientId = updated[0].patient_id;
        expect(updated[1].patient_id).not.toBeDefined();
        expect(updated[1].fields.patient_id).toEqual('person');

        return utils.requestOnTestDb(
          `/_design/medic-client/_view/contacts_by_reference?key=["shortcode","${updated[0].patient_id}"]&include_docs=true`
        );
      })
      .then(response => {
        expect(response.rows.length).toEqual(1);
        expect(response.rows[0].doc.patient_id).toEqual(newPatientId);
        expect(response.rows[0].doc.parent._id).toEqual('clinic');
        expect(response.rows[0].doc.name).toEqual('Minerva');
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
      forms: { FORM: { public_form: true }}
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
      reported_date: moment().valueOf()
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
      reported_date: moment().subtract('2 weeks').valueOf()
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
        console.log(require('util').inspect(updated, { depth: 100 }));
        expect(updated[0].lmp_date).toBeDefined();
        expect(updated[0].lmp_date).toEqual(moment().startOf('day').subtract('2 weeks').toISOString());


        expect(updated[1].patient_id).not.toBeDefined();
      });
  });
});
