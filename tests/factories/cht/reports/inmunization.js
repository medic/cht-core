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
        meta: {
          location: {
            lat: '',
            long: '',
            error: '',
            message: ''
          }
        },
        source: 'contact',
        source_id: '',
        contact: {
          _id: patient._id,
          patient_id: patient.patient_id,
          name: patient.name,
          date_of_birth: patient.date_of_birth,
          sex: patient.sex,
          phone: patient.phone,
          parent: {
            contact: {
              phone: '',
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
      chw_phone: '',
      chw_sms: `Nice work`,
      visit_confirmed: 'yes',
      vaccines_received: {
        received_hep_a_1: 'no',
        received_hep_a_2: 'no',
        received_flu: 'yes',
        received_jap_enc: 'no',
        received_meningococcal_1: 'no',
        received_meningococcal_2: 'no',
        received_meningococcal_3: 'no',
        received_meningococcal_4: 'no',
        received_mmr_1: 'no',
        received_mmr_2: 'no',
        received_mmrv_1: 'no',
        received_mmrv_2: 'no',
        received_polio_0: 'no',
        received_polio_1: 'no',
        received_polio_2: 'no',
        received_polio_3: 'no',
        received_ipv_1: 'no',
        received_ipv_2: 'no',
        received_ipv_3: 'no',
        received_fipv_1: 'no',
        received_fipv_2: 'no',
        received_penta_1: 'no',
        received_penta_2: 'no',
        received_penta_3: 'no',
        received_dpt_4: 'no',
        received_dpt_5: 'no',
        received_pneumococcal_1: 'no',
        received_pneumococcal_2: 'no',
        received_pneumococcal_3: 'no',
        received_pneumococcal_4: 'no',
        received_rotavirus_1: 'no',
        received_rotavirus_2: 'no',
        received_rotavirus_3: 'no',
        received_typhoid_1: 'no',
        received_typhoid_2: 'no',
        received_vitamin_a: 'no',
        received_yellow_fever: 'no'
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
        default_chw_sms_note: '',
        is_sms_edited: 'yes',
        g_chw_sms: ''
      },
      group_review: {
        submit: '',
        r_summary: '',
        r_patient_id: patient.patient_id,
        r_pregnancy_details: '',
        r_visit: '',
        r_visit_yes: '',
        r_vaccines_given: '',
        r_flu: '',
        r_followup: '',
        r_followup_note1: '',
        r_followup_note2: ''
      },
      meta: {
        instanceID: `uuid:${uuidv4()}`,
        deprecatedID: ''
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
