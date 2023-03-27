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
  'patient_age_in_years': '23',
  'patient_uuid': '091d10d9-2f5c-4965-9c20-96730c6fc300',
  'patient_id': '96854',
  'patient_name': 'James',
  'patient_short_name': 'the woman',
  'patient_short_name_start': 'The woman',
  'lmp_date_8601': '2020-09-01',
  'edd_8601': '2020-09-01',
  'days_since_lmp': '238',
  'weeks_since_lmp': '34',
  'weeks_since_lmp_rounded': '34',
  'lmp_method_approx': 'no',
  'lmp_updated': 'no',
  't_pregnancy_follow_up_date': '',
  't_pregnancy_follow_up': 'no',
  't_danger_signs_referral_follow_up_date': '2021-04-30T00:00:00.000-04:00',
  't_danger_signs_referral_follow_up': 'no',
  'hiv_status_known': 'yes',
  'tt_received': '',
  'deworming_med_received': 'yes',
  'context_vars': {
    'lmp_date_8601_ctx': '2020-09-01',
    'lmp_method_approx_ctx': 'yes',
    'pregnancy_follow_up_date_recent_ctx': '',
    'risk_factors_ctx': '',
    'risk_factor_extra_ctx': '',
    'hiv_tested_ctx': 'no',
    'tt_received_ctx': 'no',
    'deworming_med_received_ctx': '',
    'edd_ctx': '8 Jun, 2021',
    'weeks_since_lmp_rounded_ctx': '34',
    'pregnancy_uuid_ctx': 'b618d88b-fae5-4ab7-8289-a0416bd7294d'
  },
  'pregnancy_summary': {
    'current_weeks_pregnant': '',
    'current_edd': '',
    'visit_option': 'yes',
    'g_age_correct': 'yes'
  },
  'anc_visits_hf': {
    'anc_visits_hf_past': {
      'pregnancy_follow_up_date_recent': '',
      'report_other_visits': 'no',
      'visited_dates_count': ''
    },
    'risk_factors': {
      'previous_risk_factors_note': '',
      'no_previous_risks_note': '',
      'new_risks': 'none',
      'additional_risk_check': 'no',
      'r_risk_factor_present': 'no'
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
      'llin_use': 'yes',
      'llin_advice_note': '',
      'malaria_prophylaxis_note': ''
    },
    'iron_folate': {
      'iron_folate_daily': 'yes',
      'iron_folate_note': ''
    },
    'deworming': {
      'deworming_med': 'yes',
      'deworming_med_note': ''
    },
    'safe_practices_tips': {
      'deliver_hf_note': ''
    },
    'hiv_status': {
      'hiv_tested': 'yes',
      'hiv_importance_note': ''
    },
    'safe_pregnancy_practices': 'no'
  },
  'summary': {
    'r_submit_note': '',
    'r_summary_details': '',
    'r_patient_details': '',
    'r_summary': '',
    'r_pregnancy_details': '',
    'r_space_1': '',
    'r_referrals': '',
    'r_who_recommends': '',
    'r_refer_hf_appropriate_time': '',
    'r_follow_up_tasks': '',
    'r_following_tasks': '',
    'r_fup_pregnancy_visit': '',
    'next_visit_weeks': '2',
    'edd_summary': '1 Sep, 2020',
    'next_appointment_date': '',
    'custom_translations': {
      'custom_woman_label_translator': 'woman',
      'custom_woman_label': 'the woman',
      'custom_woman_start_label_translator': 'woman-start',
      'custom_woman_start_label': 'The woman'
    }
  },
  'data': {
    '__activity_to_report': 'home_visit',
    '__gestational_age_correct': 'yes',
    '__miscarriage_date': '',
    '__abortion_date': '',
    '__visit_task_clear_option': '',
    '__gestational_age_update_method': '',
    '__gestational_age_update_weeks': '',
    '__gestational_age_update_edd': '',
    '__lmp_updated': 'no',
    '__lmp_date_new': '',
    '__edd_new': '',
    '__last_visit_attended': '',
    '__report_additional_anc_hf_visits': 'no',
    '__num_additional_anc_hf_visits': '',
    '__additional_anc_hf_visit_dates': '',
    '__has_risk_factors_not_previously_reported': 'no',
    '__heart_condition': 'no',
    '__asthma': 'no',
    '__high_blood_pressure': 'no',
    '__diabetes': 'no',
    '__additional_high_risk_condition_to_report': 'no',
    '__additional_high_risk_condition': '',
    '__next_anc_hf_visit_date_known': 'no',
    '__next_anc_hf_visit_date': '',
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
    '__has_danger_sign': 'no',
    '__uses_llin': 'yes',
    '__takes_iron_folate_daily': 'yes',
    '__received_deworming_meds': 'yes',
    '__tested_for_hiv_in_past_3_months': 'yes',
    '__received_tetanus_toxoid_this_pregnancy': '',
    'meta': {
      '__patient_uuid': '091d10d9-2f5c-4965-9c20-96730c6fc300',
      '__patient_id': '96854',
      '__household_uuid': '8935e9d8-0b2a-5eb0-ae54-ad1377a60097',
      '__source': 'contact',
      '__source_id': '',
      '__pregnancy_uuid': 'b618d88b-fae5-4ab7-8289-a0416bd7294d'
    }
  },
  'meta': {
    'instanceID': 'uuid:ae917346-42a6-43a5-8372-5ed4d00eadee'
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
  'lmp_updated',
  't_pregnancy_follow_up_date',
  't_pregnancy_follow_up',
  't_danger_signs_referral_follow_up_date',
  't_danger_signs_referral_follow_up',
  'hiv_status_known',
  'tt_received',
  'deworming_med_received',
  'context_vars',
  'pregnancy_summary.current_weeks_pregnant',
  'pregnancy_summary.current_edd',
  'anc_visits_hf.risk_factors.previous_risk_factors_note',
  'anc_visits_hf.risk_factors.no_previous_risks_note',
  'anc_visits_hf.anc_visits_hf_next.anc_visit_advice_note',
  'danger_signs.danger_signs_note',
  'danger_signs.r_danger_sign_present',
  'danger_signs.congratulate_no_ds_note',
  'safe_pregnancy_practices.malaria.llin_advice_note',
  'safe_pregnancy_practices.malaria.malaria_prophylaxis_note',
  'safe_pregnancy_practices.iron_folate.iron_folate_note',
  'safe_pregnancy_practices.deworming.deworming_med_note',
  'safe_pregnancy_practices.safe_practices_tips',
  'safe_pregnancy_practices.hiv_status.hiv_importance_note',
  'summary',
  'data',
  'meta'
];

module.exports = new Factory()
  .sequence('_id', uuid.v4)
  .attr('form', 'pregnancy_home_visit')
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
  .attr('geolocation_log', geolocation.geoLog.build())
  .attr('geolocation',  geolocation.geo.build());
