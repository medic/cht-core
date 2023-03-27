const Factory = require('rosie').Factory;
const uuid = require('uuid');
const moment = require('moment');
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
  'facility_id': '',
  'patient_age_in_years': '23',
  'patient_uuid': '091d10d9-2f5c-4965-9c20-96730c6fc300',
  'patient_id': '96854',
  'patient_name': 'James',
  'patient_short_name': 'the woman',
  'patient_short_name_start': 'Woman',
  't_danger_signs_referral_follow_up': 'no',
  't_danger_signs_referral_follow_up_date': '2021-04-30T00:00:00.000-04:00',
  'condition': {
    'woman_outcome': 'alive_well'
  },
  'pnc_danger_sign_check': {
    'pnc_danger_sign_note': '',
    'fever': 'no',
    'severe_headache': 'no',
    'vaginal_bleeding': 'no',
    'vaginal_discharge': 'no',
    'convulsion': 'no',
    'r_pnc_danger_sign_present': 'no'
  },
  'delivery_outcome': {
    'babies_delivered': '1',
    'babies_alive': '1',
    'babies_delivered_num': '1',
    'babies_alive_num': '1',
    'babies_deceased_num': '0',
    'delivery_date': moment().format('YYYY-MM-DD'),
    'delivery_place': 'health_facility',
    'delivery_mode': 'vaginal'
  },
  'babys_condition': {
    'baby_repeat_count': '1',
    'baby_repeat': [
      {
        'baby_details': {
          'baby_n': '',
          'baby_condition': 'alive_well',
          'baby_name': 'Tammy Jones',
          'baby_sex': 'female',
          'birth_weight_know': 'yes',
          'birth_weight': '2000',
          'birth_length_know': 'yes',
          'birth_length': '40',
          'vaccines_received': 'bcg_only',
          'breastfeeding': 'yes',
          'breastfed_within_1_hour': 'no',
          'baby_danger_sign_note': '',
          'infected_umbilical_cord': 'no',
          'convulsion': 'no',
          'difficulty_feeding': 'no',
          'vomit': 'no',
          'drowsy': 'no',
          'stiff': 'no',
          'yellow_skin': 'no',
          'fever': 'no',
          'blue_skin': 'no',
          'r_baby_danger_sign_present': 'no',
          'child_doc': '9126f1d9-868d-4f59-a451-b1be70e75b8b'
        }
      }
    ],
    'r_baby_danger_sign_present_joined': 'no',
    'r_baby_danger_sign_present_any': 'no'
  },
  'safe_postnatal_practices': {
    'safe_postnatal_practice_1': '',
    'safe_postnatal_practice_2': '',
    'safe_postnatal_practice_3': '',
    'safe_postnatal_practice_4': '',
    'safe_postnatal_practice_5': ''
  },
  'pnc_visits': {
    'who_note': '',
    'pnc_visits_attended': 'none',
    'pnc_visits_additional': '0',
    'days': '0'
  },
  'summary': {
    'r_submit_note': '',
    'r_summary_details': '',
    'r_patient_details': '',
    'r_pregnancy_outcome': '',
    'r_woman_condition': '',
    'r_condition_well': '',
    'r_delivery_details': '',
    'r_delivery_date': '',
    'r_delivery_place': '',
    'r_babies_delivered_num': '',
    'r_babies_deceased_num': '',
    'r_pnc_visits': '',
    'r_pnc_visits_completed': '',
    'r_pnc_visit_none': '',
    'r_pnc_visits_add': '',
    'r_referrals': '',
    'r_who_schedule_note': '',
    'r_pnc_schedule_note': '',
    'custom_translations': {
      'custom_woman_label_translator': 'woman',
      'custom_woman_label': 'the woman',
      'custom_woman_start_label_translator': 'woman-start',
      'custom_woman_start_label': 'Woman',
      'delivery_place_label_translator': 'health_facility',
      'delivery_place_label': 'Health facility',
      'woman_death_place_label_translator': '',
      'woman_death_place_label': ''
    }
  },
  'data': {
    '__woman_condition': 'alive_well',
    '__fever': 'no',
    '__severe_headache': 'no',
    '__vaginal_bleeding': 'no',
    '__vaginal_discharge': 'no',
    '__convulsions': 'no',
    '__has_danger_sign': 'no',
    '__woman_death_date': '',
    '__woman_death_place': '',
    '__delivered_before_death': '',
    '__woman_death_notes': '',
    '__babies_delivered': '1',
    '__babies_deceased': '0',
    '__babies_alive': '1',
    '__delivery_date': '2021-04-27',
    '__delivery_place': 'health_facility',
    '__delivery_place_other': '',
    '__delivery_mode': 'vaginal',
    '__delivery_conductor': '',
    '__delivery_conductor_other': '',
    '__pnc_visit_within_24_hrs': 'no',
    '__pnc_visit_3_days': 'no',
    '__pnc_visit_7_days': 'no',
    '__pnc_visit_6_weeks': 'no',
    '__pnc_visits_num_selected': '0',
    '__pnc_visits_additional': '0',
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
    'instanceID': 'uuid:a6f1aa20-036c-42dd-9415-c462ccb71c04'
  }
};

const hiddenFields = [
  'household_id',
  'area_id',
  'facility_id',
  'patient_age_in_years',
  'patient_uuid',
  'patient_id',
  'patient_name',
  'patient_short_name',
  'patient_short_name_start',
  't_danger_signs_referral_follow_up',
  't_danger_signs_referral_follow_up_date',
  'pnc_danger_sign_check.r_pnc_danger_sign_present',
  'babys_condition.baby_repeat.baby_details.baby_n',
  'babys_condition.baby_repeat.baby_details.baby_danger_sign_note',
  'babys_condition.baby_repeat.baby_details.r_baby_danger_sign_present',
  'babys_condition.baby_repeat.baby_details.baby_profile.name',
  'babys_condition.baby_repeat.baby_details.baby_profile.sex',
  'babys_condition.baby_repeat.baby_details.baby_profile.date_of_birth',
  'babys_condition.baby_repeat.baby_details.baby_profile.parent',
  'babys_condition.baby_repeat.baby_details.baby_profile.type',
  'babys_condition.baby_repeat.baby_details.baby_profile.created_by_doc',
  'babys_condition.baby_repeat.baby_details.child_doc',
  'safe_postnatal_practices',
  'pnc_visits.who_note',
  'pnc_visits.days',
  'summary',
  'data',
  'meta'
];

module.exports = new Factory()
  .sequence('_id', uuid.v4)
  .attr('form', 'delivery')
  .attr('type', 'data_record')
  .attr('content_type', 'xml')
  .attr('reported_date', () => new Date().valueOf())
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
