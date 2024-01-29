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
    place_id: 'the_health_center',
    parent: { _id: 'district_hospital' },
    reported_date: new Date().getTime()
  },
  {
    _id: 'clinic',
    name: 'Clinic',
    type: 'clinic',
    place_id: 'the_clinic',
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

const getIds = docs => docs.map(doc => doc._id);

describe('accept_patient_reports', () => {
  before(() => utils.saveDocs(contacts));
  after(() => utils.revertDb([], true));
  afterEach(() => utils.revertDb(getIds(contacts), true));

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
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        expect(Object.keys(info.transitions)).to.be.empty;
      });
  });

  it('should add errors when patient not found or place not found or validation does not pass', () => {
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
          }],
        },
        {
          form: 'FORMPLACE',
          validations: {
            list: [
              {
                property: 'place_id',
                rule: 'lenMin(5) && lenMax(10)',
                message: [{
                  locale: 'en',
                  content: 'Place id incorrect'
                }],
              },
            ],
            join_responses: false
          },
          messages: [{
            event_type: 'registration_not_found',
            message: [{
              locale: 'en',
              content: 'Place not found'
            }],
          }],
        }
      ],
      forms: { FORM: { }, FORMPLACE: { } },
    };

    const withUnknownPatient = {
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
      },
    };

    const withInvalidPatientId = {
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
      },
    };

    const withUnknownPlace = {
      _id: uuid(),
      type: 'data_record',
      form: 'FORMPLACE',
      from: '+phone',
      fields: {
        place_id: 'unknown'
      },
      reported_date: new Date().getTime(),
      contact: {
        _id: 'person',
        parent: { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
      },
    };

    const withInvalidPlaceId = {
      _id: uuid(),
      type: 'data_record',
      form: 'FORMPLACE',
      from: '+phone',
      fields: {
        place_id: 'this will not match the validation rule'
      },
      reported_date: new Date().getTime(),
      contact: {
        _id: 'person',
        parent: { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
      },
    };

    const docs = [withUnknownPatient, withInvalidPatientId, withUnknownPlace, withInvalidPlaceId];
    const ids = getIds(docs);

    return utils
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDocs(docs))
      .then(() => sentinelUtils.waitForSentinel(ids))
      .then(() => sentinelUtils.getInfoDocs(ids))
      .then(infos => {
        infos.forEach((info, idx) => {
          expect(info.transitions.accept_patient_reports.ok).to.equal(true, `failed for doc${idx}`);
        });
      })
      .then(() => utils.getDocs(ids))
      .then(updated => {
        expect(updated[0].tasks).to.have.lengthOf(1);
        expect(updated[0].tasks[0].messages[0].message).to.equal('Patient not found');
        expect(updated[0].tasks[0].messages[0].to).to.equal('+phone');
        expect(updated[0].tasks[0].state).to.equal('pending');

        expect(updated[0].errors).to.have.lengthOf(1);
        expect(updated[0].errors[0].code).to.equal('registration_not_found');

        expect(updated[1].tasks).to.have.lengthOf(1);
        expect(updated[1].tasks[0].messages[0].message).to.equal('Patient id incorrect');
        expect(updated[1].tasks[0].messages[0].to).to.equal('+phone');
        expect(updated[1].tasks[0].state).to.equal('pending');

        expect(updated[1].errors).to.have.lengthOf(1);
        expect(updated[1].errors[0].message).to.equal('Patient id incorrect');

        expect(updated[2].tasks).to.have.lengthOf(1);
        expect(updated[2].tasks[0].messages[0].message).to.equal('Place not found');
        expect(updated[2].tasks[0].messages[0].to).to.equal('+phone');
        expect(updated[2].tasks[0].state).to.equal('pending');

        expect(updated[2].errors).to.have.lengthOf(1);
        expect(updated[2].errors[0].code).to.equal('registration_not_found');

        expect(updated[3].tasks).to.have.lengthOf(1);
        expect(updated[3].tasks[0].messages[0].message).to.equal('Place id incorrect');
        expect(updated[3].tasks[0].messages[0].to).to.equal('+phone');
        expect(updated[3].tasks[0].state).to.equal('pending');

        expect(updated[3].errors).to.have.lengthOf(1);
        expect(updated[3].errors[0].message).to.equal('Place id incorrect');
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
              recipient: 'recipient_1',
              message: [{
                locale: 'en',
                content: 'message_1'
              }],
            },
            {
              event_type: 'report_accepted',
              recipient: 'recipient_2',
              bool_expr: 'doc.type === "data_record"',
              message: [{
                locale: 'en',
                content: 'message_2'
              }],
            },
            {
              event_type: 'report_accepted',
              recipient: 'recipient_3',
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
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDocs([doc1, doc2]))
      .then(() => sentinelUtils.waitForSentinel([doc1._id, doc2._id]))
      .then(() => sentinelUtils.getInfoDocs([doc1._id, doc2._id]))
      .then(infos => {
        expect(infos[0].transitions.accept_patient_reports.ok).to.be.true;
        expect(infos[1].transitions.accept_patient_reports.ok).to.be.true;
      })
      .then(() => utils.getDocs([doc1._id, doc2._id]))
      .then(updated => {
        expect(updated[0].tasks).to.have.lengthOf(2);

        expect(updated[0].tasks[0].messages[0].message).to.equal('message_1');
        expect(updated[0].tasks[0].messages[0].to).to.equal('+phone');
        expect(updated[0].tasks[0].state).to.equal('pending');

        expect(updated[0].tasks[1].messages[0].message).to.equal('message_2');
        expect(updated[0].tasks[1].messages[0].to).to.equal('+phone');
        expect(updated[0].tasks[1].state).to.equal('pending');

        expect(updated[0].errors).to.be.undefined;
        expect(updated[0].registration_id).to.be.undefined;

        expect(updated[1].tasks).to.have.lengthOf(3);

        expect(updated[1].tasks[0].messages[0].message).to.equal('message_1');
        expect(updated[1].tasks[0].messages[0].to).to.equal('+phone2');
        expect(updated[1].tasks[0].state).to.equal('pending');

        expect(updated[1].tasks[1].messages[0].message).to.equal('message_2');
        expect(updated[1].tasks[1].messages[0].to).to.equal('+phone2');
        expect(updated[1].tasks[1].state).to.equal('pending');

        expect(updated[1].tasks[2].messages[0].message).to.equal('message_3');
        expect(updated[1].tasks[2].messages[0].to).to.equal('+phone2');
        expect(updated[1].tasks[2].state).to.equal('pending');

        expect(updated[1].errors).to.be.undefined;
        expect(updated[1].registration_id).to.be.undefined;
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
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDocs(reports))
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        expect(info.transitions.accept_patient_reports.ok).to.be.true;
      })
      .then(() => utils.getDoc(doc._id))
      .then(updated => {
        expect(updated.registration_id).to.equal('registration_2');
      });
  });

  it('should add registration to doc for a place', () => {
    const settings = {
      transitions: { accept_patient_reports: true },
      patient_reports: [{ form: 'FORM', messages: [] }],
      registrations: [{ form: 'xml_form' }, { form: 'sms_form_1' }, { form: 'sms_form_2' }],
      forms: { sms_form_1: { }, sms_form_2: { }, FORM: { } }
    };

    const reports = [
      { // not a registration
        _id: 'no_registration_config_place',
        type: 'data_record',
        content_type: 'xml',
        form: 'test_form',
        fields: {
          place_id: 'the_clinic',
        },
        reported_date: new Date().getTime(),
        contact: {
          _id: 'person',
          parent: { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
        }
      },
      { // not a registration
        _id: 'incorrect_content_place',
        type: 'data_record',
        form: 'xml_form',
        fields: {
          place_id: 'the_clinic',
        },
        reported_date: new Date().getTime() + 5000
      },
      { // not a registration
        _id: 'sms_without_contact_place',
        type: 'data_record',
        form: 'sms_form_2',
        fields: {
          place_id: 'the_clinic',
        },
        reported_date: new Date().getTime() + 6000
      },
      { // valid registration
        _id: 'registration_1_place',
        type: 'data_record',
        content_type: 'xml',
        form: 'xml_form',
        fields: {
          place_id: 'the_clinic',
        },
        reported_date: new Date().getTime() + 1000
      },
      { // valid registration
        _id: 'registration_2_place',
        type: 'data_record',
        form: 'sms_form_1',
        fields: {
          place_id: 'the_clinic',
        },
        reported_date: new Date().getTime() + 3000,
        contact: {
          _id: 'person',
          parent: { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
        }
      },
      { // valid registration
        _id: 'registration_3_place',
        type: 'data_record',
        form: 'sms_form_2',
        fields: {
          place_id: 'the_clinic',
        },
        contact: { _id: 'person' },
        reported_date: new Date().getTime(),
      },
      { // valid registration for other place
        _id: 'registration_4_place',
        type: 'data_record',
        form: 'sms_form_2',
        fields: {
          place_id: 'the_health_center'
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
        place_id: 'the_clinic',
      },
      reported_date: new Date().getTime(),
      contact: {
        _id: 'person',
        parent: { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
      }
    };

    return utils
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDocs(reports))
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        expect(info.transitions.accept_patient_reports.ok).to.be.true;
      })
      .then(() => utils.getDoc(doc._id))
      .then(updated => {
        expect(updated.registration_id).to.equal('registration_2_place');
      });
  });

  it('should add registration to doc for a doc with place and patient', () => {
    const settings = {
      transitions: { accept_patient_reports: true },
      patient_reports: [{ form: 'FORM', messages: [] }],
      registrations: [{ form: 'xml_form' }, { form: 'sms_form_1' }, { form: 'sms_form_2' }],
      forms: { sms_form_1: { }, sms_form_2: { }, FORM: { } }
    };

    const reports = [
      { // valid registration for place
        _id: 'registration_1_place',
        type: 'data_record',
        content_type: 'xml',
        form: 'xml_form',
        fields: {
          place_id: 'the_clinic',
        },
        reported_date: new Date().getTime() + 1000
      },
      { // valid registration for patient
        _id: 'registration_2_patient',
        type: 'data_record',
        form: 'sms_form_1',
        fields: {
          patient_id: 'patient',
        },
        reported_date: new Date().getTime() + 3000,
        contact: {
          _id: 'person',
          parent: { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
        }
      },
      { // valid registration for place and patient
        _id: 'registration_3_place_and_patient',
        type: 'data_record',
        form: 'sms_form_2',
        fields: {
          place_id: 'the_clinic',
          patient_id: 'patient',
        },
        contact: { _id: 'person' },
        reported_date: new Date().getTime(),
      },
      { // valid registration for other place
        _id: 'registration_4_place',
        type: 'data_record',
        form: 'sms_form_2',
        fields: {
          place_id: 'the_health_center'
        },
        contact: { _id: 'person2' },
        reported_date: new Date().getTime() + 1000,
      },
    ];

    const latestRegistration = { // valid registration for place and patient
      _id: 'registration_5_place_and_patient',
      type: 'data_record',
      form: 'sms_form_2',
      fields: {
        place_id: 'the_clinic',
        patient_id: 'patient',
      },
      contact: { _id: 'person' },
      reported_date: new Date().getTime() + 5000,
    };

    const doc1 = {
      _id: uuid(),
      type: 'data_record',
      form: 'FORM',
      from: 'phone2',
      fields: {
        place_id: 'the_clinic',
        patient_id: 'patient',
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
      from: 'phone2',
      fields: {
        place_id: 'the_clinic',
        patient_id: 'patient',
      },
      reported_date: new Date().getTime(),
      contact: {
        _id: 'person',
        parent: { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
      }
    };


    return utils
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDocs(reports))
      .then(() => utils.saveDoc(doc1))
      .then(() => sentinelUtils.waitForSentinel(doc1._id))
      .then(() => sentinelUtils.getInfoDoc(doc1._id))
      .then(info => {
        expect(info.transitions.accept_patient_reports.ok).to.be.true;
      })
      .then(() => utils.getDoc(doc1._id))
      .then(updated => {
        expect(updated.registration_id).to.equal('registration_2_patient');
      })
      .then(() => utils.saveDoc(latestRegistration))
      .then(() => utils.saveDoc(doc2))
      .then(() => sentinelUtils.waitForSentinel(doc2._id))
      .then(() => sentinelUtils.getInfoDoc(doc2._id))
      .then(info => {
        expect(info.transitions.accept_patient_reports.ok).to.be.true;
      })
      .then(() => utils.getDoc(doc2._id))
      .then(updated => {
        expect(updated.registration_id).to.equal('registration_5_place_and_patient');
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
        },
        {
          form: 'SILENCE0',
          messages: [],
          silence_for: '',
          silence_type: 'type0,type1,type2'
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
      },
      {
        _id: uuid(),
        form: 'form_1',
        fields: { place_id: 'the_clinic' },
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
        fields: { place_id: 'the_clinic' },
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

    const silence1Patient = {
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

    const silence2Patient2 = {
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

    const silence2Clinic = {
      _id: uuid(),
      type: 'data_record',
      form: 'SILENCE2',
      from: 'phone',
      fields: {
        place_id: 'the_clinic',
      },
      reported_date: new Date().getTime(),
      content_type: 'xml'
    };

    const silence0PatientAndClinic = {
      _id: uuid(),
      type: 'data_record',
      form: 'SILENCE0',
      from: 'phone',
      fields: {
        place_id: 'the_clinic',
        patient_id: 'patient',
      },
      reported_date: new Date().getTime(),
      content_type: 'xml'
    };

    const registrationIds = getIds(registrations);

    return utils
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDocs(registrations))
      .then(() => utils.saveDoc(noSilence))
      .then(() => sentinelUtils.waitForSentinel(noSilence._id))
      .then(() => utils.getDocs(registrationIds))
      .then(updated => {
        // none of the scheduled tasks should be cleared
        expect(updated.every(doc => !doc.scheduled_tasks.find(task => task.state === 'cleared'))).to.be.true;
      })
      .then(() => utils.saveDoc(silence1Patient))
      .then(() => sentinelUtils.waitForSentinel(silence1Patient._id))
      .then(() => utils.getDocs(registrationIds))
      .then(updated => {
        expect(updated[0].scheduled_tasks.find(task => task.id === 1).state).to.equal('scheduled');
        expect(updated[0].scheduled_tasks.find(task => task.id === 2).state).to.equal('cleared');
        expect(updated[0].scheduled_tasks.find(task => task.id === 3).state).to.equal('cleared');
        expect(updated[0].scheduled_tasks.find(task => task.id === 4).state).to.equal('sent');
        expect(updated[0].scheduled_tasks.find(task => task.id === 5).state).to.equal('muted');

        expect(updated[1].scheduled_tasks.find(task => task.id === 1 && task.group === 'a').state)
          .to.equal('scheduled');
        expect(updated[1].scheduled_tasks.find(task => task.id === 2 && task.group === 'a').state).to.equal('cleared');
        expect(updated[1].scheduled_tasks.find(task => task.id === 3 && task.group === 'a').state).to.equal('cleared');
        expect(updated[1].scheduled_tasks.find(task => task.id === 4 && task.group === 'a').state).to.equal('cleared');
        expect(updated[1].scheduled_tasks.find(task => task.id === 5 && task.group === 'a').state).to.equal('cleared');
        expect(updated[1].scheduled_tasks.find(task => task.id === 6 && task.group === 'a').state)
          .to.equal('delivered');

        expect(updated[1].scheduled_tasks.find(task => task.id === 1 && task.group === 'b').state).to.equal('pending');
        expect(updated[1].scheduled_tasks.find(task => task.id === 2 && task.group === 'b').state).to.equal('cleared');
        expect(updated[1].scheduled_tasks.find(task => task.id === 3 && task.group === 'b').state).to.equal('cleared');
        expect(updated[1].scheduled_tasks.find(task => task.id === 4 && task.group === 'b').state).to.equal('sent');
        expect(updated[1].scheduled_tasks.find(task => task.id === 5 && task.group === 'b').state).to.equal('muted');

        expect(updated[2].scheduled_tasks).to.deep.equal(registrations[2].scheduled_tasks); // were not updated
        expect(updated[3].scheduled_tasks).to.deep.equal(registrations[3].scheduled_tasks); // were not updated

        expect(updated[4].scheduled_tasks).to.deep.equal(registrations[4].scheduled_tasks); // were not updated
        expect(updated[5].scheduled_tasks).to.deep.equal(registrations[5].scheduled_tasks); // were not updated
      })
      .then(() => utils.saveDoc(silence2Patient2))
      .then(() => sentinelUtils.waitForSentinel(silence2Patient2._id))
      .then(() => utils.getDocs(registrationIds))
      .then(updated => {
        expect(updated[2].scheduled_tasks.find(task => task.id === 1).state).to.equal('scheduled');
        expect(updated[2].scheduled_tasks.find(task => task.id === 2).state).to.equal('pending');
        expect(updated[2].scheduled_tasks.find(task => task.id === 3).state).to.equal('cleared');
        expect(updated[2].scheduled_tasks.find(task => task.id === 4).state).to.equal('cleared');
        expect(updated[2].scheduled_tasks.find(task => task.id === 5).state).to.equal('sent');

        expect(updated[3].scheduled_tasks.find(task => task.id === 1 && task.group === 'a').state)
          .to.equal('scheduled');
        expect(updated[3].scheduled_tasks.find(task => task.id === 2 && task.group === 'a').state).to.equal('cleared');
        expect(updated[3].scheduled_tasks.find(task => task.id === 3 && task.group === 'a').state).to.equal('cleared');

        expect(updated[3].scheduled_tasks.find(task => task.id === 1 && task.group === 'b').state).to.equal('pending');
        expect(updated[3].scheduled_tasks.find(task => task.id === 2 && task.group === 'b').state).to.equal('cleared');
        expect(updated[3].scheduled_tasks.find(task => task.id === 3 && task.group === 'b').state).to.equal('sent');

        expect(updated[4].scheduled_tasks).to.deep.equal(registrations[4].scheduled_tasks); // were not updated
        expect(updated[5].scheduled_tasks).to.deep.equal(registrations[5].scheduled_tasks); // were not updated
      })
      .then(() => utils.saveDoc(silence2Clinic))
      .then(() => sentinelUtils.waitForSentinel(silence2Clinic._id))
      .then(() => utils.getDocs(registrationIds))
      .then(updated => {
        expect(updated[4].scheduled_tasks.find(task => task.id === 1).state).to.equal('scheduled');
        expect(updated[4].scheduled_tasks.find(task => task.id === 2).state).to.equal('pending');
        expect(updated[4].scheduled_tasks.find(task => task.id === 3).state).to.equal('cleared');
        expect(updated[4].scheduled_tasks.find(task => task.id === 4).state).to.equal('cleared');
        expect(updated[4].scheduled_tasks.find(task => task.id === 5).state).to.equal('sent');

        expect(updated[5].scheduled_tasks.find(task => task.id === 1 && task.group === 'a').state)
          .to.equal('scheduled');
        expect(updated[5].scheduled_tasks.find(task => task.id === 2 && task.group === 'a').state).to.equal('cleared');
        expect(updated[5].scheduled_tasks.find(task => task.id === 3 && task.group === 'a').state).to.equal('cleared');

        expect(updated[5].scheduled_tasks.find(task => task.id === 1 && task.group === 'b').state).to.equal('pending');
        expect(updated[5].scheduled_tasks.find(task => task.id === 2 && task.group === 'b').state).to.equal('cleared');
        expect(updated[5].scheduled_tasks.find(task => task.id === 3 && task.group === 'b').state).to.equal('sent');
      })
      .then(() => utils.saveDoc(silence0PatientAndClinic))
      .then(() => sentinelUtils.waitForSentinel(silence0PatientAndClinic._id))
      .then(() => utils.getDocs(registrationIds))
      .then(updated => {
        const getScheduledTasks = (doc) => doc.scheduled_tasks.filter(task => task.state === 'scheduled');
        // this should have cleared everything that is left
        expect(getScheduledTasks(updated[0])).to.be.empty; // patient subject
        expect(getScheduledTasks(updated[1])).to.be.empty; // patient subject

        expect(getScheduledTasks(updated[2])).to.have.lengthOf(1); // patient2 subject
        expect(getScheduledTasks(updated[3])).to.have.lengthOf(1); // patient2 subject

        expect(getScheduledTasks(updated[4])).to.be.empty; // the_clinic subject
        expect(getScheduledTasks(updated[5])).to.be.empty; // the_clinic subject
      });
  });
});
