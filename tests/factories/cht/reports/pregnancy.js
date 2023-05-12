const Factory = require('rosie').Factory;
const uuid = require('uuid');
const _ = require('lodash');
const geolocation = require('./geolocation');

const defaultSubmitter = {
  _id: '2e0ceb06-ced2-5a63-bca0-0283a5aab0e8',
  name: 'James',
  phone: '+9779841299392',
  parent: {
    _id: '8935e9d8-0b2a-5eb0-ae54-ad1377a60097',
    parent: {
      _id: '2112ab72-448a-50bb-a15d-0b19d2927ab7'
    }
  }
};

const defaultFields = {
  'inputs': {
    'meta': {
      'location': {
        'lat': '',
        'long': '',
        'error': '',
        'message': ''
      },
      'deprecatedID': ''
    },
    'source': 'contact',
    'source_id': '',
    'contact': defaultSubmitter,
  },
  'patient_age_in_years': '21',
  'patient_uuid': '80b6e34e-7abf-5718-a572-84edbcd4593e',
  'patient_id': '10072',
  'patient_name': 'Adelia Akiyama',
  'patient_short_name': 'the woman',
  'patient_short_name_start': 'The woman',
  'lmp_date_8601': '2021-02-02',
  'edd_8601': '2021-11-09',
  'days_since_lmp': '77',
  'weeks_since_lmp': '34',
  'weeks_since_lmp_rounded': '34',
  'lmp_method_approx': 'yes',
  'hiv_status_known': 'no',
  'deworming_med_received': '',
  'tt_received': 'no',
  't_pregnancy_follow_up_date': '',
  't_pregnancy_follow_up': 'no',
  't_danger_signs_referral_follow_up_date': '2021-04-23T00:00:00.000-04:00',
  't_danger_signs_referral_follow_up': 'no',
  'gestational_age': {
    'register_method': {
      'register_note': '',
      'lmp_method': 'method_approx'
    },
    'method_approx': {
      'lmp_approx': 'approx_weeks',
      'lmp_approx_weeks': '34'
    },
    'method_lmp_summary': {
      'lmp_approx_weeks_check_note': '',
      'edd_note': '',
      'edd_check_note': ''
    },
    'g_lmp_date_8601': '2021-02-02',
    'g_lmp_date': '2 Feb, 2021',
    'g_edd_8601': '2021-11-09',
    'g_edd': '9 Nov, 2021'
  },
  'anc_visits_hf': {
    'anc_visits_hf_past': {
      'visited_hf_count': '1',
      'visited_dates_group': {
        'visited_count_confim_note_single': '',
        'visited_date_ask_single': 'no',
        'visited_dates_count': '1'
      }
    },
    'anc_visits_hf_next': {
      'anc_next_visit_date': {
        'appointment_date_known': 'no'
      },
      'anc_visit_advice_note': {
        'who_recommends_note': '',
        'prenancy_age_note': '',
        'refer_note': ''
      }
    }
  },
  'risk_factors': {
    'risk_factors_history': {
      'first_pregnancy': 'no',
      'previous_miscarriage': 'no'
    },
    'risk_factors_present': {
      'secondary_condition': 'none',
      'additional_risk_check': 'no'
    },
    'r_risk_factor_present': 'no'
  },
  'danger_signs': {
    'danger_signs_note': '',
    'danger_signs_question_note': '',
    'vaginal_bleeding': 'no',
    'fits': 'no',
    'severe_abdominal_pain': 'no',
    'severe_headache': 'no',
    'very_pale': 'no',
    'fever': 'no',
    'reduced_or_no_fetal_movements': 'no',
    'breaking_water': 'no',
    'easily_tired': 'no',
    'face_hand_swelling': 'no',
    'breathlessness': 'no',
    'r_danger_sign_present': 'no',
    'congratulate_no_ds_note': ''
  },
  'safe_pregnancy_practices': {
    'malaria': {
      'uses_llin': 'no',
      'llin_advice_note': '',
      'malaria_prophylaxis_note': ''
    },
    'iron_folate': {
      'iron_folate_daily': 'no',
      'iron_folate_note': ''
    },
    'safe_practices_tips': {
      'eat_more_note': ''
    },
    'hiv_status': {
      'hiv_tested': 'no',
      'hiv_importance_note': ''
    },
    'tetanus': {
      'tt_imm_received': 'no',
      'tt_note_1': '',
      'tt_note_2': ''
    },
    'deworming': {
      'deworming_med': 'no',
      'deworming_med_note': ''
    },
    'request_services': 'yes'
  },
  'summary': {
    'r_submit_note': '',
    'r_summary_details': '',
    'r_patient_details': '',
    'r_summary': '',
    'r_pregnancy_details': '',
    'r_space_1': '',
    'r_referrals': '',
    'r_request_services': '',
    'r_request_service_tt': '',
    'r_request_service_hiv_test': '',
    'r_request_service_iron': '',
    'r_who_recommends': '',
    'r_refer_hf_appropriate_time': '',
    'r_space_2': '',
    'check-': '',
    'r_following_tasks': '',
    'r_fup_pregnancy_visit': '',
    'next_visit_weeks': '1',
    'edd_summary': '9 Nov, 2021',
    'next_appointment_date': '',
    'custom_translations': {
      'custom_woman_label_translator': 'woman',
      'custom_woman_label': 'the woman',
      'custom_woman_start_label_translator': 'woman-start',
      'custom_woman_start_label': 'The woman'
    }
  },
  'data': {
    '__lmp_method': 'method_approx',
    '__no_lmp_registration_reason': '',
    '__lmp_date': '2021-02-02',
    '__lmp_approx_weeks': '34',
    '__lmp_approx_months': '',
    '__edd': '2021-11-09',
    '__num_previous_anc_hf_visits': '1',
    '__previous_anc_hf_visit_dates': '',
    '__next_anc_hf_visit_date_known': 'no',
    '__next_anc_hf_visit_date': '',
    '__has_risk_factors': 'no',
    '__first_pregnancy': 'no',
    '__previous_miscarriage': 'no',
    '__previous_difficulties': 'no',
    '__more_than_4_children': 'no',
    '__last_baby_born_less_than_1_year_ago': 'no',
    '__heart_condition': 'no',
    '__asthma': 'no',
    '__high_blood_pressure': 'no',
    '__diabetes': 'no',
    '__additional_high_risk_condition_to_report': 'no',
    '__additional_high_risk_condition': '',
    '__has_danger_sign': 'no',
    '__vaginal_bleeding': 'no',
    '__fits': 'no',
    '__severe_abdominal_pain': 'no',
    '__severe_headache': 'no',
    '__very_pale': 'no',
    '__fever': 'no',
    '__reduced_or_no_fetal_movements': 'no',
    '__breaking_water': 'no',
    '__easily_tired': 'no',
    '__face_hand_swelling': 'no',
    '__breathlessness': 'no',
    '__uses_llin': 'no',
    '__takes_iron_folate_daily': 'no',
    '__received_deworming_meds': '',
    '__tested_for_hiv_in_past_3_months': 'no',
    '__received_tetanus_toxoid_this_pregnancy': 'no',
    'meta': {
      '__patient_uuid': '80b6e34e-7abf-5718-a572-84edbcd4593e',
      '__patient_id': '10072',
      '__household_uuid': '3a9cecea-8414-5768-9846-474d21b51e91',
      '__source': 'contact',
      '__source_id': ''
    }
  },
  'meta': {
    'instanceID': 'uuid:09318528-a484-4d9d-b49c-473b84c22ae9'
  }
};

const hiddenFields = [
  'patient_age_in_years',
  'patient_uuid',
  'patient_id',
  'patient_name',
  'patient_short_name',
  'patient_short_name_start',
  'lmp_date_8601',
  'edd_8601',
  'days_since_lmp',
  'weeks_since_lmp',
  'weeks_since_lmp_rounded',
  'lmp_method_approx',
  'hiv_status_known',
  'deworming_med_received',
  'tt_received',
  't_pregnancy_follow_up_date',
  't_pregnancy_follow_up',
  't_danger_signs_referral_follow_up_date',
  't_danger_signs_referral_follow_up',
  'gestational_age.register_method.register_note',
  'gestational_age.method_approx.lmp_approx',
  'gestational_age.method_lmp_summary',
  'gestational_age.g_lmp_date_8601',
  'gestational_age.g_lmp_date',
  'gestational_age.g_edd_8601',
  'gestational_age.g_edd',
  'anc_visits_hf.anc_visits_hf_past.visited_dates_group.visited_count_confim_note_single',
  'anc_visits_hf.anc_visits_hf_next.anc_visit_advice_note',
  'risk_factors.r_risk_factor_present',
  'danger_signs.danger_signs_note',
  'danger_signs.r_danger_sign_present',
  'danger_signs.congratulate_no_ds_note',
  'safe_pregnancy_practices.malaria.llin_advice_note',
  'safe_pregnancy_practices.malaria.malaria_prophylaxis_note',
  'safe_pregnancy_practices.iron_folate.iron_folate_note',
  'safe_pregnancy_practices.safe_practices_tips',
  'safe_pregnancy_practices.hiv_status.hiv_importance_note',
  'safe_pregnancy_practices.tetanus.tt_note_1',
  'safe_pregnancy_practices.tetanus.tt_note_2',
  'safe_pregnancy_practices.request_services',
  'summary',
  'data',
  'meta'
];

module.exports = new Factory()
  .sequence('_id', uuid.v4)
  .attr('form', 'pregnancy')
  .attr('type', 'data_record')
  .attr('content_type', 'xml')
  .attr('reported_date', () => new Date())
  .attr('contact', ['contact'], (contact) => _.merge({}, defaultSubmitter, contact))
  .attr('fields', ['fields', 'contact'], (fields, contact) => {
    fields = _.merge({}, defaultFields, fields);
    fields.inputs.contact = _.merge({}, defaultSubmitter, contact);
    return fields;
  })
  .attr('from', '')
  .attr('hidden_fields', hiddenFields)
  .attr('geolocation_log', () => geolocation.geoLog.build())
  .attr('geolocation',  () => geolocation.geo.build());
