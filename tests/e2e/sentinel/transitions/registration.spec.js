const utils = require('../../../utils');
const sentinelUtils = require('../utils');
const uuid = require('uuid');
const moment = require('moment');
const chai = require('chai');

const defaultSettings = utils.getDefaultSettings();

const contacts = [
  {
    _id: 'district_hospital',
    name: 'District hospital',
    type: 'contact',
    contact_type: 'district_hospital',
    place_id: 'the_district_hospital',
    reported_date: new Date().getTime()
  },
  {
    _id: 'health_center',
    name: 'Health Center',
    type: 'contact',
    contact_type: 'health_center',
    place_id: 'the_health_center',
    parent: { _id: 'district_hospital' },
    reported_date: new Date().getTime()
  },
  {
    _id: 'clinic',
    name: 'Clinic',
    type: 'contact',
    contact_type: 'clinic',
    place_id: 'the_clinic',
    parent: { _id: 'health_center', parent: { _id: 'district_hospital' } },
    contact: {
      _id: 'person', parent:  { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
    },
    reported_date: new Date().getTime()
  },
  {
    _id: 'person',
    name: 'Person',
    type: 'contact',
    contact_type: 'person',
    patient_id: 'patient',
    parent: { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } },
    phone: '+444999',
    reported_date: new Date().getTime()
  },
  {
    _id: 'supervisor',
    name: 'Supervisor',
    type: 'contact',
    contact_type: 'person',
    patient_id: 'the_supervisor',
    parent: { _id: 'district_hospital' } ,
    phone: '+00000000',
    reported_date: new Date().getTime()
  },
  {
    _id: 'middle_man',
    name: 'Middle man',
    type: 'contact',
    contact_type: 'person',
    patient_id: 'the_middle_man',
    parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } ,
    phone: '+11111111',
    reported_date: new Date().getTime()
  }
];

const chwContactType = {
  id: 'chw',
  parents: ['health_center'],
  person: true
};

const nurseContactType = {
  id: 'nurse',
  parents: ['district_hospital'],
  person: true
};

const nursingHomeType = {
  id: 'nursing_home',
  parents: ['health_center'],
};

const getContactsByReference = shortcodes => {
  const keys = shortcodes.map(shortcode => ['shortcode', shortcode]);
  const qs = { keys: JSON.stringify(keys), include_docs: true };
  return utils.requestOnTestDb({ path: '/_design/medic-client/_view/contacts_by_reference', qs });
};

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
      contact: {
        _id: 'person',
        parent:  { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
      }
    };

    return utils
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        chai.expect(Object.keys(info.transitions).length).to.equal(0);
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
      contact: {
        _id: 'person',
        parent:  { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
      }
    };

    return utils
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        chai.expect(Object.keys(info.transitions).length).to.equal(0);
      })
      .then(() => utils.getDoc(doc._id))
      .then(updated => {
        chai.expect(updated.tasks).to.equal(undefined);
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
      contact: {
        _id: 'person',
        parent:  { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
      }
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
      contact: {
        _id: 'person',
        parent:  { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
      }
    };

    return utils
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDocs([ doc1, doc2 ]))
      .then(() => sentinelUtils.waitForSentinel([doc1._id, doc2._id]))
      .then(() => sentinelUtils.getInfoDocs([doc1._id, doc2._id]))
      .then(infos => {
        infos.forEach(info => {
          chai.expect(info).to.deep.nested.include({ 'transitions.registration.ok': true });
        });
      })
      .then(() => utils.getDocs([doc1._id, doc2._id]))
      .then(updated => {
        chai.expect(updated[0].tasks).to.be.ok;
        chai.expect(updated[0].tasks.length).to.equal(1);
        chai.expect(updated[0].tasks[0].messages[0]).to.include({
          message: 'Count is incorrect',
          to: '+444999',
        });

        chai.expect(updated[0].errors).to.be.ok;
        chai.expect(updated[0].errors.length).to.equal(1);
        chai.expect(updated[0].errors[0].message).to.equal('Count is incorrect');

        chai.expect(updated[1].tasks).to.be.ok;
        chai.expect(updated[1].tasks.length).to.equal(1);
        chai.expect(updated[1].tasks[0].messages[0]).to.include({
          message: 'Patient not found',
          to: '+444999',
        });

        chai.expect(updated[1].errors).to.be.ok;
        chai.expect(updated[1].errors.length).to.equal(1);
        chai.expect(updated[1].errors[0].code).to.equal('registration_not_found');
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
        messages: [{
          recipient: 'reporting_unit',
          event_type: 'report_accepted',
          message: [{
            locale: 'en',
            content: 'Patient {{patient_name}} ({{patient_id}}) added to {{clinic.name}}'
          }],
        }],
      }, {
        form: 'FORM-B',
        events: [{
          name: 'on_create',
          trigger: 'add_patient',
          params: { patient_id_field: 'our_patient_id', patient_name_field: 'our_patient_name' },
          bool_expr: ''
        }],
        messages: [{
          recipient: 'reporting_unit',
          event_type: 'report_accepted',
          bool_expr: 'doc.patient',
          message: [{
            locale: 'en',
            content: 'Patient {{patient_name}} ({{patient_id}}) added to {{clinic.name}}'
          }],
        }],
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
      contact: {
        _id: 'person',
        parent:  { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
      }
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
      contact: {
        _id: 'person',
        parent:  { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
      }
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
      contact: {
        _id: 'person',
        parent:  { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
      }
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
      contact: {
        _id: 'person',
        parent:  { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
      }
    };

    let newPatientId;

    return utils
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDocs([ doc1, doc2, doc3, doc4 ]))
      .then(() => sentinelUtils.waitForSentinel([doc1._id, doc2._id, doc3._id, doc4._id]))
      .then(() => sentinelUtils.getInfoDocs([doc1._id, doc2._id, doc3._id, doc4._id]))
      .then(infos => {
        infos.forEach(info => {
          chai.expect(info).to.deep.nested.include({ 'transitions.registration.ok': true });
        });
      })
      .then(() => utils.getDocs([doc1._id, doc2._id, doc3._id, doc4._id]))
      .then(updated => {
        chai.expect(updated[0].patient_id).not.to.equal(undefined);
        chai.expect(updated[0].tasks.length).to.equal(1);
        chai.expect(updated[0].tasks[0].messages[0]).to.include({
          to: '+444999',
          message: `Patient Minerva (${updated[0].patient_id}) added to Clinic`
        });

        newPatientId = updated[0].patient_id;

        chai.expect(updated[1].patient_id).to.equal(undefined);
        chai.expect(updated[1].fields.patient_id).to.equal('person');
        chai.expect(updated[1].errors).to.be.ok;
        chai.expect(updated[1].errors.length).to.equal(1);
        chai.expect(updated[1].errors[0].code).to.equal('registration_not_found');
        chai.expect(updated[1].tasks.length).to.equal(1);

        chai.expect(updated[2].patient_id).to.equal('venus');
        chai.expect(updated[2].errors).to.equal(undefined);
        chai.expect(updated[2].tasks.length).to.equal(1);
        chai.expect(updated[2].tasks[0].messages[0]).to.include({
          to: '+444999',
          message: `Patient Venus (venus) added to Clinic`
        });

        chai.expect(updated[3].patient_id).to.equal(undefined);
        chai.expect(updated[3].errors).to.be.ok;
        chai.expect(updated[3].errors.length).to.equal(1);
        chai.expect(updated[3].errors[0].code).to.equal('provided_patient_id_not_unique');

        return getContactsByReference([newPatientId, 'venus']);
      })
      .then(patients => {
        chai.expect(patients.rows.length).to.equal(2);

        chai.expect(patients.rows[0].doc).to.deep.include({
          patient_id: newPatientId,
          parent: { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } },
          name: 'Minerva',
          type: 'person',
          created_by: 'person',
          source_id: doc1._id,
        });

        chai.expect(patients.rows[1].doc).to.deep.include({
          patient_id: 'venus',
          parent: { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } },
          name: 'Venus',
          type: 'person',
          created_by: 'person',
          source_id: doc3._id,
        });
      });
  });

  it('should not create people with invalid / missing parent', () => {
    const settings = {
      transitions: { registration: true },
      registrations: [{
        form: 'FORM-A',
        events: [{
          name: 'on_create',
          trigger: 'add_patient',
          params: { parent_id: 'parent' },
          bool_expr: ''
        }],
        messages: [],
      }, {
        form: 'FORM-B',
        events: [{
          name: 'on_create',
          trigger: 'add_patient',
          params: { parent_id: 'parent_id' },
          bool_expr: ''
        }],
        messages: [],
      }, {
        form: 'FORM-CHW',
        events: [{
          name: 'on_create',
          trigger: 'add_patient',
          params: { parent_id: 'parent_id', contact_type: 'chw' },
          bool_expr: ''
        }],
        messages: [{
          recipient: 'reporting_unit',
          event_type: 'parent_invalid',
          message: [{
            locale: 'en',
            content:
              'Cannot create a person type "chw" under parent {{parent.place_id}}(contact type {{parent.contact_type}})'
          }],
        }, {
          recipient: 'reporting_unit',
          event_type: 'parent_field_not_provided',
          message: [{
            locale: 'en',
            content: 'Parent field is required'
          }],
        }, {
          recipient: 'reporting_unit',
          event_type: 'parent_not_found',
          message: [{
            locale: 'en',
            content: 'Parent not found'
          }],
        }],
      }, {
        form: 'FORM-NURSE',
        events: [{
          name: 'on_create',
          trigger: 'add_patient',
          params: { parent_id: 'parent_id', contact_type: 'nurse' },
          bool_expr: ''
        }],
        messages: [{
          recipient: 'reporting_unit',
          event_type: 'parent_invalid',
          message: [{
            locale: 'en',
            content: 'Cannot create a person type "nurse" under parent ' +
              '{{parent.place_id}}(contact type {{parent.contact_type}})'
          }],
        }, {
          recipient: 'reporting_unit',
          event_type: 'parent_field_not_provided',
          message: [{
            locale: 'en',
            content: 'Parent field is required'
          }],
        }, {
          recipient: 'reporting_unit',
          event_type: 'parent_not_found',
          message: [{
            locale: 'en',
            content: 'Parent not found'
          }],
        }],
      }],
      forms: { 'FORM-A': { }, 'FORM-B': { }, 'FORM-CHW': {}, 'FORM-NURSE': {}},
      contact_types: [...defaultSettings.contact_types, chwContactType, nurseContactType]
    };

    const chwNoParent = {
      _id: 'chwNoParent',
      type: 'data_record',
      form: 'FORM-CHW',
      from: '+00000000',
      fields: {
        patient_name: 'Solaris',
      },
      reported_date: moment().valueOf(),
      contact: { _id: 'supervisor', parent: { _id: 'district_hospital' } }
    };

    const chwNonExistingParent = {
      _id: 'chwNonExistingParent',
      type: 'data_record',
      form: 'FORM-CHW',
      from: '+00000000',
      fields: {
        patient_name: 'Lunaris',
        parent_id: 'not_a_valid_parent',
      },
      reported_date: moment().valueOf(),
      contact: { _id: 'supervisor', parent: { _id: 'district_hospital' } }
    };

    const invalidParent1 = {
      _id: 'invalidParent1',
      type: 'data_record',
      form: 'FORM-CHW',
      from: '+00000000',
      fields: {
        patient_name: 'Lunaris',
        parent_id: 'the_clinic', // can't create a CHW under a clinic
      },
      reported_date: moment().valueOf(),
      contact: { _id: 'supervisor', parent: { _id: 'district_hospital' } }
    };

    const invalidParent2 = {
      _id: 'invalidParent2',
      type: 'data_record',
      form: 'FORM-CHW',
      from: '+00000000',
      fields: {
        patient_name: 'Kitava',
        parent_id: 'the_district_hospital', // can't create a CHW under a district_hospital
      },
      reported_date: moment().valueOf(),
      contact: { _id: 'supervisor', parent: { _id: 'district_hospital' } }
    };

    const invalidParent3 = {
      _id: 'invalidParent3',
      type: 'data_record',
      form: 'FORM-NURSE',
      from: '+00000000',
      fields: {
        patient_name: 'Coleen',
        parent_id: 'the_health_center', // can't create a Nurse under a health_center
      },
      reported_date: moment().valueOf(),
      contact: { _id: 'supervisor', parent: { _id: 'district_hospital' } }
    };

    const ids = [chwNoParent._id, chwNonExistingParent._id, invalidParent1._id, invalidParent2._id, invalidParent3._id];

    return utils
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDocs([chwNoParent, chwNonExistingParent, invalidParent1, invalidParent2, invalidParent3]))
      .then(() => sentinelUtils.waitForSentinel(ids))
      .then(() => sentinelUtils.getInfoDocs(ids))
      .then(infos => {
        infos.forEach(info => {
          chai.expect(info).to.deep.nested.include({ 'transitions.registration.ok': true });
        });
      })
      .then(() => utils.getDocs(ids))
      .then(updated => {
        updated.forEach(doc => {
          chai.expect(doc.patient_id).not.to.equal(undefined);
          chai.expect(doc.errors).to.be.an('array');
          chai.expect(doc.errors.length).to.equal(1);
          chai.expect(doc.tasks).to.be.an('array');
          chai.expect(doc.tasks.length).to.equal(1);
        });

        chai.expect(updated[0].errors[0]).to.deep.equal({
          code: 'parent_field_not_provided',
          message: 'Parent field is required',
        });

        chai.expect(updated[0].tasks[0].messages[0]).to.include({
          to: '+00000000',
          message: 'Parent field is required'
        });

        chai.expect(updated[1].errors[0]).to.deep.equal({
          code: 'parent_not_found',
          message: 'Parent not found',
        });
        chai.expect(updated[1].tasks[0].messages[0]).to.include({
          to: '+00000000',
          message: 'Parent not found'
        });

        chai.expect(updated[2].errors[0]).to.deep.equal({
          code: 'parent_invalid',
          message: 'Cannot create a person type "chw" under parent the_clinic(contact type clinic)',
        });
        chai.expect(updated[2].tasks[0].messages[0]).to.include({
          to: '+00000000',
          message: 'Cannot create a person type "chw" under parent the_clinic(contact type clinic)'
        });

        chai.expect(updated[3].errors[0]).to.deep.equal({
          code: 'parent_invalid',
          message:
            'Cannot create a person type "chw" under parent the_district_hospital(contact type district_hospital)',
        });
        chai.expect(updated[3].tasks[0].messages[0]).to.include({
          to: '+00000000',
          message:
            'Cannot create a person type "chw" under parent the_district_hospital(contact type district_hospital)'
        });

        chai.expect(updated[4].errors[0]).to.deep.equal({
          code: 'parent_invalid',
          message: 'Cannot create a person type "nurse" under parent the_health_center(contact type health_center)',
        });
        chai.expect(updated[4].tasks[0].messages[0]).to.include({
          to: '+00000000',
          message: 'Cannot create a person type "nurse" under parent the_health_center(contact type health_center)'
        });

        return getContactsByReference(updated.map(doc => doc.patient_id));
      })
      .then(patients => {
        chai.expect(patients.rows.length).to.equal(0);
      });
  });

  it('should create people with selected parent', () => {
    const settings = {
      transitions: { registration: true },
      registrations: [{
        form: 'FORM-PERSON',
        events: [{
          name: 'on_create',
          trigger: 'add_patient',
          params: { parent_id: 'parent' },
          bool_expr: ''
        }],
        messages: [{
          recipient: 'reporting_unit',
          event_type: 'report_accepted',
          bool_expr: 'doc.patient',
          message: [{
            locale: 'en',
            content: 'Patient {{patient_name}} ({{patient_id}}) added to {{parent.name}}'
          }]
        }],
      }, {
        form: 'FORM-CHW',
        events: [{
          name: 'on_create',
          trigger: 'add_patient',
          params: { parent_id: 'parent_id', contact_type: 'chw' },
          bool_expr: ''
        }],
        messages: [{
          recipient: 'reporting_unit',
          event_type: 'report_accepted',
          bool_expr: 'doc.patient',
          message: [{
            locale: 'en',
            content: 'CHW {{patient_name}} ({{patient_id}}) added to {{parent.name}}'
          }]
        }],
      }, {
        form: 'FORM-NURSE',
        events: [{
          name: 'on_create',
          trigger: 'add_patient',
          params: { parent_id: 'the_parent', contact_type: 'nurse', patient_name_field: 'nurse_name' },
          bool_expr: ''
        }],
        messages: [{
          recipient: 'reporting_unit',
          event_type: 'report_accepted',
          bool_expr: 'doc.patient',
          message: [{
            locale: 'en',
            content: 'Nurse {{nurse_name}} ({{patient_id}}) added to {{parent.name}}'
          }]
        }],
      }],
      forms: { 'FORM-PERSON': { }, 'FORM-CHW': {}, 'FORM-NURSE': {}},
      contact_types: [...defaultSettings.contact_types, chwContactType, nurseContactType]
    };

    const createPerson = {
      _id: uuid(),
      type: 'data_record',
      form: 'FORM-PERSON',
      from: '+00000000',
      fields: {
        patient_name: 'Solaris',
        parent: 'the_clinic'
      },
      reported_date: moment().valueOf(),
      contact: { _id: 'supervisor', parent: { _id: 'district_hospital' } }
    };

    const createChw = {
      _id: uuid(),
      type: 'data_record',
      form: 'FORM-CHW',
      from: '+00000000',
      fields: {
        patient_name: 'Lunaris',
        parent_id: 'the_health_center'
      },
      reported_date: moment().valueOf(),
      contact: { _id: 'supervisor', parent: { _id: 'district_hospital' } }
    };

    const createNurse = {
      _id: uuid(),
      type: 'data_record',
      form: 'FORM-NURSE',
      from: '+444999',
      fields: {
        nurse_name: 'Apollo',
        the_parent: 'the_district_hospital'
      },
      reported_date: moment().valueOf(),
      contact: {
        _id: 'person',
        parent:  { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
      }
    };

    const ids = [createPerson._id, createChw._id, createNurse._id];
    let updatedDocs;

    return utils
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDocs([createPerson, createChw, createNurse]))
      .then(() => sentinelUtils.waitForSentinel(ids))
      .then(() => sentinelUtils.getInfoDocs(ids))
      .then(infos => {
        infos.forEach(info => {
          chai.expect(info).to.deep.nested.include({ 'transitions.registration.ok': true });
        });
      })
      .then(() => utils.getDocs(ids))
      .then(updated => {
        updatedDocs = updated;
        updated.forEach(doc => {
          chai.expect(doc.patient_id).not.to.equal(undefined);
          chai.expect(doc.errors).to.equal(undefined);
          chai.expect(doc.tasks.length).to.equal(1);
          chai.expect(doc.patient).to.equal(undefined);
          chai.expect(doc.place).to.equal(undefined);
        });

        chai.expect(updated[0].tasks[0].messages[0]).to.include({
          to: '+00000000',
          message: `Patient Solaris (${updated[0].patient_id}) added to Clinic`
        });
        chai.expect(updated[1].tasks[0].messages[0]).to.include({
          to: '+00000000',
          message: `CHW Lunaris (${updated[1].patient_id}) added to Health Center`
        });
        chai.expect(updated[2].tasks[0].messages[0]).to.include({
          to: '+444999',
          message: `Nurse Apollo (${updated[2].patient_id}) added to District hospital`
        });

        return getContactsByReference(updated.map(doc => doc.patient_id));
      })
      .then(patients => {
        chai.expect(patients.rows.length).to.equal(3);

        chai.expect(patients.rows[0].doc).to.deep.include({
          name: 'Solaris',
          type: 'person',
          parent: { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } },
          created_by: 'supervisor',
          source_id: createPerson._id,
          patient_id: updatedDocs[0].patient_id,
        });

        chai.expect(patients.rows[1].doc).to.deep.include({
          name: 'Lunaris',
          type: 'contact',
          contact_type: 'chw',
          parent: { _id: 'health_center', parent: { _id: 'district_hospital' } },
          created_by: 'supervisor',
          source_id: createChw._id,
          patient_id: updatedDocs[1].patient_id,
        });

        chai.expect(patients.rows[2].doc).to.deep.include({
          name: 'Apollo',
          type: 'contact',
          contact_type: 'nurse',
          parent: { _id: 'district_hospital' },
          created_by: 'person',
          source_id: createNurse._id,
          patient_id: updatedDocs[2].patient_id,
        });
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
      contact: {
        _id: 'person',
        parent:  { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
      }
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
      contact: {
        _id: 'person',
        parent:  { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
      }
    };

    return utils
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDocs([ doc1, doc2 ]))
      .then(() => sentinelUtils.waitForSentinel([doc1._id, doc2._id]))
      .then(() => sentinelUtils.getInfoDocs([doc1._id, doc2._id]))
      .then(infos => {
        infos.forEach(info => {
          chai.expect(info).to.deep.nested.include({ 'transitions.registration.ok': true });
        });
      })
      .then(() => utils.getDocs([doc1._id, doc2._id]))
      .then(updated => {
        chai.expect(updated[0].lmp_date).to.be.ok;
        chai.expect(updated[0].lmp_date)
          .to.equal(moment().utc(false).startOf('day').subtract(2, 'weeks').toISOString());
        chai.expect(updated[0].expected_date)
          .to.equal(moment().utc(false).startOf('day').add(38, 'weeks').toISOString());

        chai.expect(updated[1].lmp_date).to.be.ok;
        chai.expect(updated[1].lmp_date)
          .to.equal(moment().utc(false).startOf('day').subtract(4, 'weeks').toISOString());
        chai.expect(updated[1].expected_date)
          .to.equal(moment().utc(false).startOf('day').add(36, 'weeks').toISOString());
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
      contact: {
        _id: 'person',
        parent:  { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
      }
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
      contact: {
        _id: 'person',
        parent:  { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
      }
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
      contact: {
        _id: 'person',
        parent:  { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
      }
    };

    return utils
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDocs([ doc1, doc2, doc3 ]))
      .then(() => sentinelUtils.waitForSentinel([doc1._id, doc2._id, doc3._id]))
      .then(() => sentinelUtils.getInfoDocs([doc1._id, doc2._id, doc3._id]))
      .then(infos => {
        infos.forEach(info => {
          chai.expect(info).to.deep.nested.include({ 'transitions.registration.ok': true });
        });
      })
      .then(() => utils.getDocs([doc1._id, doc2._id, doc3._id]))
      .then(updated => {
        chai.expect(updated[0].birth_date)
          .to.equal(moment().utc(false).startOf('day').subtract(2, 'months').toISOString());
        chai.expect(updated[1].birth_date)
          .to.equal(moment().utc(false).startOf('day').subtract(4, 'weeks').toISOString());
        chai.expect(updated[2].birth_date)
          .to.equal(moment().utc(false).startOf('day').subtract(2, 'years').toISOString());
      });
  });

  it('should not create places with missing contact_type', () => {
    const settings = {
      transitions: { registration: true },
      registrations: [{
        form: 'FORM-PLACE',
        events: [{
          name: 'on_create',
          trigger: 'add_place',
          bool_expr: ''
        }],
        messages: [],
      }],
      forms: { 'FORM-PLACE': { } },
    };

    const createPlace = {
      _id: uuid(),
      type: 'data_record',
      form: 'FORM-PLACE',
      from: '+00000000',
      fields: {
        place_name: 'Solaris',
      },
      reported_date: moment().valueOf(),
      contact: { _id: 'supervisor', parent: { _id: 'district_hospital' } }
    };

    return utils
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDoc(createPlace))
      // Sentinel won't process these, so we can't wait for a metadata update, but let's give it 5 seconds just in case
      .then(() => utils.delayPromise(() => Promise.resolve(), 5000))
      .then(() => sentinelUtils.getInfoDocs(createPlace._id))
      .then(infos => {
        chai.expect(infos[0].transitions).to.equal(undefined);
      })
      .then(() => utils.getDoc(createPlace._id))
      .then(updated => {
        chai.expect(Object.keys(updated)).to.have.members([...Object.keys(createPlace), '_rev']);
        chai.expect(updated).to.deep.include(createPlace);
      });
  });

  it('should not create place with invalid / missing parent', () => {
    const settings = {
      transitions: { registration: true },
      registrations: [{
        form: 'FORM-CLINIC_NO_PARENT',
        events: [{
          name: 'on_create',
          trigger: 'add_place',
          params: { contact_type: 'clinic' },
          bool_expr: ''
        }],
        messages: [{
          recipient: 'reporting_unit',
          event_type: 'parent_invalid',
          message: [{
            locale: 'en',
            content: 'Cannot create a place type "clinic" under parent ' +
              '{{parent.place_id}}(contact type {{parent.contact_type}})'
          }],
        }],
      }, {
        form: 'FORM-CLINIC',
        events: [{
          name: 'on_create',
          trigger: 'add_place',
          params: { contact_type: 'clinic', parent_id: 'parent' },
          bool_expr: ''
        }],
        messages: [{
          recipient: 'reporting_unit',
          event_type: 'parent_invalid',
          message: [{
            locale: 'en',
            content: 'Cannot create a place type "clinic" under parent ' +
              '{{parent.place_id}}(contact type {{parent.contact_type}})'
          }],
        }, {
          recipient: 'reporting_unit',
          event_type: 'parent_field_not_provided',
          message: [{
            locale: 'en',
            content: 'Parent field is required'
          }],
        }, {
          recipient: 'reporting_unit',
          event_type: 'parent_not_found',
          message: [{
            locale: 'en',
            content: 'Parent not found'
          }],
        }],
      }, {
        form: 'FORM-HEALTH_CENTER',
        events: [{
          name: 'on_create',
          trigger: 'add_place',
          params: { contact_type: 'health_center', parent_id: 'parent_id' },
          bool_expr: ''
        }],
        messages: [{
          recipient: 'reporting_unit',
          event_type: 'parent_invalid',
          message: [{
            locale: 'en',
            content: 'Cannot create a place type "health_center" under parent ' +
              '{{parent.place_id}}(contact type {{parent.contact_type}})'
          }],
        }, {
          recipient: 'reporting_unit',
          event_type: 'parent_field_not_provided',
          message: [{
            locale: 'en',
            content: 'Parent field is required'
          }],
        }, {
          recipient: 'reporting_unit',
          event_type: 'parent_not_found',
          message: [{
            locale: 'en',
            content: 'Parent not found'
          }],
        }],
      }],
      forms: { 'FORM-CLINIC_NO_PARENT': { }, 'FORM-CLINIC': { }, 'FORM-HEALTH_CENTER': {} },
    };

    const clinicNoParentUnderClinic = {
      _id: 'clinicNoParentUnderClinic',
      type: 'data_record',
      form: 'FORM-CLINIC_NO_PARENT',
      from: '+444999',
      fields: {
        place_name: 'Lunaris',
      },
      reported_date: moment().valueOf(),
      contact: {
        _id: 'person',
        parent:  { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
      }
    };

    const clinicNoParentUnderDistrict = {
      _id: 'clinicNoParentUnderDistrict',
      type: 'data_record',
      form: 'FORM-CLINIC_NO_PARENT',
      from: '+00000000',
      fields: {
        place_name: 'Lunaris',
      },
      reported_date: moment().valueOf(),
      contact: { _id: 'supervisor', parent: { _id: 'district_hospital' } }
    };

    const clinicUnderClinic = {
      _id: 'clinicUnderClinic',
      type: 'data_record',
      form: 'FORM-CLINIC',
      from: '+11111111',
      fields: {
        place_name: 'Lunaris',
        parent: 'the_clinic'
      },
      reported_date: moment().valueOf(),
      contact: { _id: 'middle_man', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
    };

    const clinicUnderDistrict = {
      _id: 'clinicUnderDistrict',
      type: 'data_record',
      form: 'FORM-CLINIC',
      from: '+11111111',
      fields: {
        place_name: 'Lunaris',
        parent: 'the_district_hospital'
      },
      reported_date: moment().valueOf(),
      contact: { _id: 'middle_man', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
    };

    const clinicNoParent = {
      _id: 'clinicNoParent',
      type: 'data_record',
      form: 'FORM-CLINIC',
      from: '+11111111',
      fields: {
        place_name: 'Lunaris',
      },
      reported_date: moment().valueOf(),
      contact: { _id: 'middle_man', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
    };

    const clinicNoExistingParent = {
      _id: 'clinicNonExistingParent',
      type: 'data_record',
      form: 'FORM-CLINIC',
      from: '+11111111',
      fields: {
        place_name: 'Lunaris',
        parent: 'some_parent_that_doesnt_exist'
      },
      reported_date: moment().valueOf(),
      contact: { _id: 'middle_man', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
    };

    const healthCenterUnderClinic = {
      _id: 'healthCenterUnderClinic',
      type: 'data_record',
      form: 'FORM-HEALTH_CENTER',
      from: '+11111111',
      fields: {
        place_name: 'Lunaris',
        parent_id: 'the_clinic'
      },
      reported_date: moment().valueOf(),
      contact: { _id: 'middle_man', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
    };

    const reports = [
      clinicNoParentUnderClinic,
      clinicNoParentUnderDistrict,
      clinicUnderClinic,
      clinicUnderDistrict,
      clinicNoParent,
      clinicNoExistingParent,
      healthCenterUnderClinic,
    ];

    const ids = reports.map(r => r._id);

    return utils
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDocs(reports))
      .then(() => sentinelUtils.waitForSentinel(ids))
      .then(() => sentinelUtils.getInfoDocs(ids))
      .then(infos => {
        infos.forEach(info => {
          chai.expect(info).to.deep.nested.include({ 'transitions.registration.ok': true });
        });
      })
      .then(() => utils.getDocs(ids))
      .then(updated => {
        updated.forEach(doc => {
          chai.expect(doc.place_id).not.to.equal(undefined);
          chai.expect(doc.patient_id).to.equal(undefined);
          chai.expect(doc.errors).to.be.an('array');
          chai.expect(doc.errors.length).to.equal(1);
          chai.expect(doc.tasks).to.be.an('array');
          chai.expect(doc.tasks.length).to.equal(1);
          chai.expect(doc.place).to.equal(undefined);
          chai.expect(doc.patient).to.equal(undefined);
        });

        chai.expect(updated[0].errors[0]).to.deep.equal({
          code: 'parent_invalid',
          message: 'Cannot create a place type "clinic" under parent the_clinic(contact type clinic)',
        });
        chai.expect(updated[0].tasks[0].messages[0]).to.include({
          to: '+444999',
          message: 'Cannot create a place type "clinic" under parent the_clinic(contact type clinic)',
        });

        chai.expect(updated[1].errors[0]).to.deep.equal({
          code: 'parent_invalid',
          message: 'Cannot create a place type "clinic" under parent ' +
              'the_district_hospital(contact type district_hospital)',
        });
        chai.expect(updated[1].tasks[0].messages[0]).to.include({
          to: '+00000000',
          message: 'Cannot create a place type "clinic" under parent ' +
              'the_district_hospital(contact type district_hospital)',
        });

        chai.expect(updated[2].errors[0]).to.deep.equal({
          code: 'parent_invalid',
          message: 'Cannot create a place type "clinic" under parent ' +
              'the_clinic(contact type clinic)',
        });
        chai.expect(updated[2].tasks[0].messages[0]).to.include({
          to: '+11111111',
          message: 'Cannot create a place type "clinic" under parent ' +
              'the_clinic(contact type clinic)',
        });

        chai.expect(updated[3].errors[0]).to.deep.equal({
          code: 'parent_invalid',
          message: 'Cannot create a place type "clinic" under parent ' +
              'the_district_hospital(contact type district_hospital)',
        });
        chai.expect(updated[3].tasks[0].messages[0]).to.include({
          to: '+11111111',
          message: 'Cannot create a place type "clinic" under parent ' +
              'the_district_hospital(contact type district_hospital)',
        });

        chai.expect(updated[4].errors[0]).to.deep.equal({
          code: 'parent_field_not_provided',
          message: 'Parent field is required',
        });
        chai.expect(updated[4].tasks[0].messages[0]).to.include({
          to: '+11111111',
          message: 'Parent field is required',
        });

        chai.expect(updated[5].errors[0]).to.deep.equal({
          code: 'parent_not_found',
          message: 'Parent not found',
        });
        chai.expect(updated[5].tasks[0].messages[0]).to.include({
          to: '+11111111',
          message: 'Parent not found',
        });

        chai.expect(updated[6].errors[0]).to.deep.equal({
          code: 'parent_invalid',
          message: 'Cannot create a place type "health_center" under parent ' +
              'the_clinic(contact type clinic)',
        });
        chai.expect(updated[6].tasks[0].messages[0]).to.include({
          to: '+11111111',
          message: 'Cannot create a place type "health_center" under parent ' +
              'the_clinic(contact type clinic)',
        });

        return getContactsByReference(updated.map(doc => doc.place_id));
      })
      .then(result => {
        chai.expect(result.rows.length).to.equal(0);
      });
  });

  it('should create places with correct type, name and parent', () => {
    const settings = {
      transitions: { registration: true },
      registrations: [{
        form: 'FORM-CLINIC_NO_PARENT',
        events: [{
          name: 'on_create',
          trigger: 'add_place',
          params: { contact_type: 'clinic', place_name_field: 'the_place_name' },
          bool_expr: ''
        }],
        messages: [{
          recipient: 'reporting_unit',
          event_type: 'report_accepted',
          bool_expr: 'doc.place',
          message: [{
            locale: 'en',
            content: 'Place {{place.name}}({{place_id}}) added to {{health_center.name}}'
          }],
        }, {
          recipient: 'reporting_unit',
          event_type: 'parent_invalid',
          message: [{
            locale: 'en',
            content: 'Cannot create a place type "clinic" under parent ' +
              '{{parent.place_id}}(contact type {{parent.contact_type}})'
          }],
        }],
      }, {
        form: 'FORM-NURSING_HOME',
        events: [{
          name: 'on_create',
          trigger: 'add_place',
          params: { contact_type: 'nursing_home', parent_id: 'parent' },
          bool_expr: ''
        }],
        messages: [{
          recipient: 'reporting_unit',
          event_type: 'report_accepted',
          bool_expr: 'doc.place',
          message: [{
            locale: 'en',
            content: 'Place {{name}}({{place_id}}) added to {{health_center.name}}'
          }],
        }, {
          recipient: 'reporting_unit',
          event_type: 'parent_invalid',
          message: [{
            locale: 'en',
            content: 'Cannot create a place type "nursing_home" under parent ' +
              '{{parent.place_id}}(contact type {{parent.contact_type}})'
          }],
        }, {
          recipient: 'reporting_unit',
          event_type: 'parent_field_not_provided',
          message: [{
            locale: 'en',
            content: 'Parent field is required'
          }],
        }, {
          recipient: 'reporting_unit',
          event_type: 'parent_not_found',
          message: [{
            locale: 'en',
            content: 'Parent not found'
          }],
        }],
      }, {
        form: 'FORM-HEALTH_CENTER',
        events: [{
          name: 'on_create',
          trigger: 'add_place',
          params: { contact_type: 'health_center', parent_id: 'parent_id' },
          bool_expr: ''
        }],
        messages: [{
          recipient: 'reporting_unit',
          event_type: 'report_accepted',
          bool_expr: 'doc.place',
          message: [{
            locale: 'en',
            content: 'Place {{name}}({{place_id}}) added to {{district.name}}'
          }],
        }, {
          recipient: 'reporting_unit',
          event_type: 'parent_field_not_provided',
          message: [{
            locale: 'en',
            content: 'Parent field is required'
          }],
        }, {
          recipient: 'reporting_unit',
          event_type: 'parent_not_found',
          message: [{
            locale: 'en',
            content: 'Parent not found'
          }],
        }],
      }],
      forms: { 'FORM-CLINIC_NO_PARENT': { }, 'FORM-NURSING_HOME': { }, 'FORM-HEALTH_CENTER': {} },
      contact_types: [
        ...defaultSettings.contact_types,
        nursingHomeType,
      ]
    };

    const clinicNoParent = {
      _id: 'clinicNoParent',
      type: 'data_record',
      form: 'FORM-CLINIC_NO_PARENT',
      from: '+11111111',
      fields: {
        the_place_name: 'Toyota',
      },
      reported_date: moment().valueOf(),
      contact: { _id: 'middle_man', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
    };

    const nursingHome = {
      _id: 'justANursingHome',
      type: 'data_record',
      form: 'FORM-NURSING_HOME',
      from: '+00000000',
      fields: {
        place_name: 'Ford',
        parent: 'the_health_center'
      },
      reported_date: moment().valueOf(),
      contact: { _id: 'supervisor', parent: { _id: 'district_hospital' } }
    };

    const healthCenter = {
      _id: 'newHealthCenter',
      type: 'data_record',
      form: 'FORM-HEALTH_CENTER',
      from: '+00000000',
      fields: {
        place_name: 'Mazda',
        parent_id: 'the_district_hospital'
      },
      reported_date: moment().valueOf(),
      contact: { _id: 'supervisor', parent: { _id: 'district_hospital' } }
    };

    const docs = [ clinicNoParent, nursingHome, healthCenter ];
    const ids = docs.map(doc => doc._id);
    let updatedDocs;

    return utils
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDocs(docs))
      .then(() => sentinelUtils.waitForSentinel(ids))
      .then(() => sentinelUtils.getInfoDocs(ids))
      .then(infos => {
        infos.forEach(info => {
          chai.expect(info).to.deep.nested.include({ 'transitions.registration.ok': true });
        });
      })
      .then(() => utils.getDocs(ids))
      .then(updated => {
        updatedDocs = updated;

        updated.forEach(doc => {
          chai.expect(doc.patient_id).to.equal(undefined);
          chai.expect(doc.place_id).not.to.equal(undefined);
          chai.expect(doc.errors).to.equal(undefined);
          chai.expect(doc.tasks.length).to.equal(1);
          chai.expect(doc.patient).to.equal(undefined);
          chai.expect(doc.place).to.equal(undefined);
        });

        chai.expect(updated[0].tasks[0].messages[0]).to.include({
          to: '+11111111',
          message: `Place Toyota(${updated[0].place_id}) added to Health Center`
        });

        chai.expect(updated[1].tasks[0].messages[0]).to.include({
          to: '+00000000',
          message: `Place Ford(${updated[1].place_id}) added to Health Center`
        });

        chai.expect(updated[2].tasks[0].messages[0]).to.include({
          to: '+00000000',
          message: `Place Mazda(${updated[2].place_id}) added to District hospital`
        });

        return getContactsByReference(updated.map(doc => doc.place_id));
      })
      .then(places => {
        chai.expect(places.rows.length).to.equal(3);

        chai.expect(places.rows[0].doc).to.deep.include({
          name: 'Toyota',
          type: 'clinic',
          place_id: updatedDocs[0].place_id,
          source_id: updatedDocs[0]._id,
          created_by: updatedDocs[0].contact._id,
          parent: { _id: 'health_center', parent: { _id: 'district_hospital' } }
        });
        chai.expect(places.rows[1].doc).to.deep.include({
          name: 'Ford',
          type: 'contact',
          contact_type: 'nursing_home',
          place_id: updatedDocs[1].place_id,
          source_id: updatedDocs[1]._id,
          created_by: updatedDocs[1].contact._id,
          parent: { _id: 'health_center', parent: { _id: 'district_hospital' } }
        });
        chai.expect(places.rows[2].doc).to.deep.include({
          name: 'Mazda',
          type: 'health_center',
          place_id: updatedDocs[2].place_id,
          source_id: updatedDocs[2]._id,
          created_by: updatedDocs[2].contact._id,
          parent: { _id: 'district_hospital' }
        });

        places.rows.forEach(row => {
          // no primary contact
          chai.expect(row.doc.contact).to.equal(undefined);
        });
      });
  });

  it('should get parent by phone when contact not available', () => {
    // this test is kinda dumb
    // we're testing the situation where we don't have `update_clinics` transitions enabled
    // but still want to create people and places
    // we have to set the forms as "public" to avoid checking the "contact" in the filter

    const settings = {
      transitions: { registration: true },
      registrations: [
        {
          form: 'FORM-CLINIC',
          events: [{
            name: 'on_create',
            trigger: 'add_place',
            params: { contact_type: 'clinic', place_name_field: 'the_place_name' },
            bool_expr: ''
          }],
          messages: [{
            recipient: 'reporting_unit',
            event_type: 'report_accepted',
            bool_expr: 'doc.place',
            message: [{
              locale: 'en',
              content: 'Place {{place.name}}({{place_id}}) added to {{health_center.name}}'
            }],
          }, {
            recipient: 'reporting_unit',
            event_type: 'parent_invalid',
            message: [{
              locale: 'en',
              content: 'Cannot create a place type "clinic" under parent ' +
              '{{parent.place_id}}(contact type {{parent.contact_type}})'
            }],
          }],
        },
        {
          form: 'FORM-PERSON',
          events: [{
            name: 'on_create',
            trigger: 'add_patient',
            params: { contact_type: 'person', patient_name_field: 'the_patient_name' },
            bool_expr: ''
          }],
          messages: [{
            recipient: 'reporting_unit',
            event_type: 'report_accepted',
            bool_expr: 'doc.patient',
            message: [{
              locale: 'en',
              content: 'Person {{patient.name}}({{patient_id}}) added to {{clinic.name}}'
            }],
          }, {
            recipient: 'reporting_unit',
            event_type: 'parent_invalid',
            message: [{
              locale: 'en',
              content: 'Cannot create a person type "person" under parent ' +
              '{{parent.place_id}}(contact type {{parent.contact_type}})'
            }],
          }],
        },
      ],
      forms: { 'FORM-CLINIC': { public_form: true }, 'FORM-PERSON': { public_form: true }},
    };

    const createClinic = {
      _id: 'createClinic',
      type: 'data_record',
      form: 'FORM-CLINIC',
      from: '+11111111',
      fields: {
        the_place_name: 'Orbit',
      },
      reported_date: moment().valueOf(),
    };

    const createPerson = {
      _id: 'createPerson',
      type: 'data_record',
      form: 'FORM-PERSON',
      from: '+444999',
      fields: {
        the_patient_name: 'Mentos',
      },
      reported_date: moment().valueOf(),
    };

    const docs = [createClinic, createPerson];
    const ids = docs.map(doc => doc._id);
    let updatedDocs;

    return utils
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDocs(docs))
      .then(() => sentinelUtils.waitForSentinel(ids))
      .then(() => sentinelUtils.getInfoDocs(ids))
      .then(infos => {
        infos.forEach(info => {
          chai.expect(info).to.deep.nested.include({ 'transitions.registration.ok': true });
        });
      })
      .then(() => utils.getDocs(ids))
      .then(updated => {
        updatedDocs = updated;
        updated.forEach(doc => {
          chai.expect(doc.errors).to.equal(undefined);
          chai.expect(doc.tasks.length).to.equal(1);
          chai.expect(doc.patient).to.equal(undefined);
          chai.expect(doc.place).to.equal(undefined);
        });

        chai.expect(updated[0].place_id).not.to.equal(undefined);
        chai.expect(updated[0].tasks[0].messages[0]).to.include({
          to: '+11111111',
          message: `Place Orbit(${updated[0].place_id}) added to Health Center`
        });

        chai.expect(updated[1].patient_id).not.to.equal(undefined);
        chai.expect(updated[1].tasks[0].messages[0]).to.include({
          to: '+444999',
          message: `Person Mentos(${updated[1].patient_id}) added to Clinic`
        });

        return getContactsByReference([updated[0].place_id, updated[1].patient_id]);
      })
      .then(contacts => {
        chai.expect(contacts.rows.length).to.equal(2);

        chai.expect(contacts.rows[0].doc).to.deep.include({
          name: 'Orbit',
          type: 'clinic',
          place_id: updatedDocs[0].place_id,
          source_id: updatedDocs[0]._id,
          created_by: updatedDocs[0].contact._id,
          parent: { _id: 'health_center', parent: { _id: 'district_hospital' } }
        });
        chai.expect(contacts.rows[0].doc.contact).to.equal(undefined);

        chai.expect(contacts.rows[1].doc).to.deep.include({
          name: 'Mentos',
          type: 'contact',
          contact_type: 'person',
          patient_id: updatedDocs[1].patient_id,
          source_id: updatedDocs[1]._id,
          created_by: updatedDocs[1].contact._id,
          parent: { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } },
        });
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
        patient_uuid: 'person',
        patient_id: 'patient',
      },
      some_date_field: moment().subtract(3, 'week').valueOf(),
      reported_date: moment().valueOf(),
      contact: {
        _id: 'person',
        parent:  { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
      }
    };

    const doc2 = {
      _id: uuid(),
      type: 'data_record',
      form: 'FORM',
      from: '+444999',
      fields: {
        patient_uuid: 'person',
        patient_id: 'patient',
      },
      some_date_field: moment().subtract(2, 'week').valueOf(),
      reported_date: moment().valueOf(),
      contact: {
        _id: 'person',
        parent:  { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
      }
    };

    return utils
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDoc(doc1))
      .then(() => sentinelUtils.waitForSentinel(doc1._id))
      .then(() => sentinelUtils.getInfoDoc(doc1._id))
      .then(info => {
        chai.expect(info).to.deep.nested.include({ 'transitions.registration.ok': true });
      })
      .then(() => utils.getDoc(doc1._id))
      .then(updated => {
        chai.expect(updated.scheduled_tasks).to.be.ok;
        chai.expect(updated.scheduled_tasks.length).to.equal(3);

        chai.expect(updated.scheduled_tasks[0].type).to.equal('sch1');
        chai.expect(updated.scheduled_tasks[0].group).to.equal(2);
        chai.expect(updated.scheduled_tasks[0].state).to.equal('scheduled');
        chai.expect(updated.scheduled_tasks[0].messages[0].message).to.equal('message2');

        chai.expect(updated.scheduled_tasks[1].type).to.equal('sch2');
        chai.expect(updated.scheduled_tasks[1].group).to.equal(1);
        chai.expect(updated.scheduled_tasks[1].state).to.equal('scheduled');
        chai.expect(updated.scheduled_tasks[1].messages[0].message).to.equal('message3');

        chai.expect(updated.scheduled_tasks[2].type).to.equal('sch2');
        chai.expect(updated.scheduled_tasks[2].group).to.equal(1);
        chai.expect(updated.scheduled_tasks[2].state).to.equal('scheduled');
        chai.expect(updated.scheduled_tasks[2].messages[0].message).to.equal('message4');
      })
      .then(() => utils.saveDoc(doc2))
      .then(() => sentinelUtils.waitForSentinel(doc2._id))
      .then(() => sentinelUtils.getInfoDoc(doc2._id))
      .then(info => {
        chai.expect(info).to.deep.nested.include({ 'transitions.registration.ok': true });
      })
      .then(() => utils.getDocs([doc1._id, doc2._id ]))
      .then(updated => {
        //1st doc has cleared schedules
        chai.expect(updated[0].scheduled_tasks).to.be.ok;
        chai.expect(updated[0].scheduled_tasks.length).to.equal(3);
        expect(updated[0].scheduled_tasks.every(task => task.state === 'cleared')).toBe(true);

        //2nd doc has schedules
        chai.expect(updated[1].scheduled_tasks).to.be.ok;
        chai.expect(updated[1].scheduled_tasks.length).to.equal(3);

        chai.expect(updated[1].scheduled_tasks[0].type).to.equal('sch1');
        chai.expect(updated[1].scheduled_tasks[0].group).to.equal(2);
        chai.expect(updated[1].scheduled_tasks[0].state).to.equal('scheduled');
        chai.expect(updated[1].scheduled_tasks[0].messages[0].message).to.equal('message2');

        chai.expect(updated[1].scheduled_tasks[1].type).to.equal('sch2');
        chai.expect(updated[1].scheduled_tasks[1].group).to.equal(1);
        chai.expect(updated[1].scheduled_tasks[1].state).to.equal('scheduled');
        chai.expect(updated[1].scheduled_tasks[1].messages[0].message).to.equal('message3');

        chai.expect(updated[1].scheduled_tasks[2].type).to.equal('sch2');
        chai.expect(updated[1].scheduled_tasks[2].group).to.equal(1);
        chai.expect(updated[1].scheduled_tasks[2].state).to.equal('scheduled');
        chai.expect(updated[1].scheduled_tasks[2].messages[0].message).to.equal('message4');
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
      contact: {
        _id: 'person',
        parent:  { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
      }
    };

    return utils
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        chai.expect(info).to.deep.nested.include({ 'transitions.registration.ok': true });
      })
      .then(() => utils.getDoc(doc._id))
      .then(updated => {
        chai.expect(updated.tasks).to.be.ok;
        chai.expect(updated.tasks.length).to.equal(3);

        chai.expect(updated.tasks[0].messages[0].message).to.equal('Report accepted');
        chai.expect(updated.tasks[1].messages[0].message).to.equal('alpha');
        chai.expect(updated.tasks[2].messages[0].message).to.equal('beta');
      });
  });
});
