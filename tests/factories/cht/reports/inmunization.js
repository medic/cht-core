const { v4: uuidv4 } = require('uuid');

const immunizationVisitFactory = {
  build: ({ contact, patient }) => ({
    _id: uuidv4(),
    form: 'immunization_visit',
    type: 'data_record',
    content_type: 'xml',
    reported_date: Date.now(),
    contact: contact,
    fields: {
      inputs: {
        source: 'contact',
        contact: {
          _id: patient._id,
          patient_id: patient.patient_id,
          name: patient.name,
          date_of_birth: patient.date_of_birth,
          sex: patient.sex,
          phone: patient.phone,
          parent: {
            contact: {
              name: patient.name
            }
          }
        }
      },
      patient_age_in_years: '2',
      patient_phone: patient.phone || '',
      patient_uuid: patient._id,
      patient_id: patient.patient_id,
      patient_name: patient.name,
      chw_name: patient.name,
      chw_sms: `Nice work`,
      visit_confirmed: 'yes',
      vaccines_received: {
        received_flu: 'yes'
      },
      group_select_vaccines: {
        g_vaccines: 'flu'
      },
      group_flu: {
        g_flu: 'yes'
      },
      group_note: {
        default_chw_sms: 'default',
        default_chw_sms_text: `Nice work`,
        is_sms_edited: 'yes'
      },
      group_review: {
        r_patient_id: patient.patient_id
      },
      meta: {
        instanceID: `uuid:${uuidv4()}`
      }
    },
    geolocation_log: [
      {
        timestamp: Date.now(),
        recording: {
          code: 1,
          message: 'User denied Geolocation'
        }
      }
    ],
    geolocation: {
      code: 1,
      message: 'User denied Geolocation'
    }
  })
};

module.exports = immunizationVisitFactory;
