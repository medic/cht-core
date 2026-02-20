const { CONTACT_TYPES } = require('@medic/constants');

const now = Date.now();

const getPlace = (context, type, nameSuffix) => {
  return {
    type,
    name: `Joanna's ${nameSuffix}`,
    meta: {
      created_by: context.username,
      created_by_person_uuid: '',
      created_by_place_uuid: ''
    },
    reported_date: now,
  };
};

const getDistrictHospital = context => getPlace(context, 'district_hospital', 'Hospital');
const getHealthCenter = context => getPlace(context, CONTACT_TYPES.HEALTH_CENTER, 'Health Center');
const getHousehold = context => getPlace(context, 'clinic', 'Household');

const getPerson = (context, role) => {
  return {
    type: 'person',
    name: 'Joanna',
    sex: '',
    phone_alternate: '',
    role: role,
    external_id: '',
    notes: '',
    meta: {
      created_by: context.username,
      created_by_person_uuid: '',
      created_by_place_uuid: ''
    },
    reported_date: now,
  };
};

const getPatient = context => getPerson(context, 'patient');
const getWoman = context => getPerson(context, 'patient');
const getChild = context => getPerson(context, 'patient');
const getInfant = context => getPerson(context, 'patient');


const getPregnancyDangerSign = (patient) => {
  return {
    form: 'pregnancy_danger_sign',
    type: 'data_record',
    content_type: 'xml',
    reported_date: now,
    fields: {
      patient_age_in_years: 34,
      patient_name: patient.name,
      patient_id: patient.patient_id,
      t_danger_signs_referral_follow_up: 'yes', // Intentionally 'yes'
      danger_signs: {
        danger_signs_note: '',
        danger_signs_question_note: '',
        vaginal_bleeding: 'yes', // Intentionally 'yes'
        refer_patient_note_1: '',
        refer_patient_note_2: '',
      },
    },
  };
};


const deathReport = (patient) => {
  return {
    form: 'death_report',
    type: 'data_record',
    content_type: 'xml',
    reported_date: now,
    fields: {
      patient_name: patient.name,
      patient_id: patient.patient_id,
      death_details: {
        date_of_death: now,
        place_of_death: 'home',
        death_information: '',
      },
    },
  };
};

const pregnancyRegistration = (patient) => {
  return {
    form: 'pregnancy',
    type: 'data_record',
    content_type: 'xml',
    reported_date: now,
    fields: {
      patient_age_in_years: 34,
      patient_name: patient.name,
      patient_id: patient.patient_id,
      group_llin_parity: {
        patient_llin: 'no'
      },
      group_anc_visit: {
        anc_visit: 'no',
        anc_visit_repeat: null,
        prophylaxis_taken: 'no',
        last_dose: null,
        last_dose_date: null,
        tt_imm: 'no',
        tt_received: null,
        tt_date: null,
        given_mebendazole: 'no'
      },
      g_nutrition_screening: {
        muac_score: 7478903295705088,
        mother_weight: 8257856090406912,
        last_fed: '6',
        last_food: [
          [
            'milk'
          ]
        ],
        mother_hiv_status: 'o',
        mother_arv: null
      },
      group_risk_factors: {
        gravida: 1,
        parity: 1,
        g_risk_factors: [
          'r8'
        ]
      },
      group_danger_signs: {
        g_danger_signs: [
          'd8',
          'd3',
          'd7',
          'd2'
        ]
      },
      lmp_method: 'calendar',
      risk_factors: [
        'r8'
      ],
      danger_signs: [
        'd8',
        'd3',
        'd7',
        'd2'
      ],
      anc_visit_identifier: '',
      anc_last_bp_reading: '',
      patient_age_at_lmp: 34,
      days_since_lmp: 40,
      weeks_since_lmp: 4
    },
  };
};

const getPNCDangerSignFollowUpBaby = (patient) => {
  return {
    form: 'pnc_danger_sign_follow_up_baby',
    type: 'data_record',
    content_type: 'xml',
    reported_date: now,
    fields: {
      patient_age_in_years: 32,
      patient_uuid: patient._id,
      patient_id: patient.patient_id,
      patient_name: patient.name,
      t_danger_signs_referral_follow_up: 'yes',
      danger_signs: {
        visit_confirm: 'yes',
        danger_sign_present: 'yes',
        danger_signs_question_note: '',
        r_danger_sign_present: 'yes',
        congratulate_no_ds_note: '',
        refer_patient_note_1: '',
        refer_patient_note_2: ''
      }
    }
  };
};

const getPregnancyHomeVisit = (patient) => {
  return {
    form: 'pregnancy_home_visit',
    type: 'data_record',
    content_type: 'xml',
    reported_date: now,
    fields: {
      patient_age_in_years: 43,
      patient_uuid: patient._id,
      patient_id: patient.patient_id,
      patient_name: patient.name,
      patient_short_name: '',
      patient_short_name_start: '',
      lmp_method_approx: 'approx',
      danger_signs: {
        vaginal_bleeding: 'yes',
        fits: 'yes',
        severe_abdominal_pain: 'yes',
        severe_headache: 'yes',
        very_pale: 'yes',
        fever: 'yes',
        reduced_or_no_fetal_movements: 'yes',
        breaking_water: 'yes',
        easily_tired: 'yes',
        face_hand_swelling: 'yes',
        breathlessness: 'yes',
        r_danger_sign_present: 'yes',
      },
      safe_pregnancy_practices: {
        malaria: {
          llin_use: 'yes',
        },
        iron_folate: {
          iron_folate_daily: 'yes',
        },
        deworming: {
          deworming_med: 'yes',
        },
        hiv_status: {
          hiv_tested: 'yes',
        },
        tetanus: {
          tt_imm_received: 'yes',
        },
        safe_pregnancy_practices: 'yes',
      }
    }
  };
};

module.exports = (context) => {
  return [
    {
      designId: 'district-hospital',
      amount: 30,
      db: 'not-medic',
      getDoc: () => getDistrictHospital(context),
      children: [
        {
          designId: 'health-center',
          amount: 100,
          db: 'not-medic',
          getDoc: () => getHealthCenter(context),
          children: [
            {
              designId: 'household',
              amount: 20,
              db: 'not-medic',
              getDoc: () => getHousehold(context),
              children: [
                {
                  designId: 'woman-person',
                  amount: 1,
                  db: 'not-medic',
                  getDoc: () => getWoman(context),
                  children: [
                    {
                      designId: 'pregnancy-report',
                      amount: 1,
                      db: 'not-medic',
                      getDoc: ({parent}) => pregnancyRegistration(parent),
                    },
                    {
                      designId: 'pregnancy-home-visit',
                      amount: 1,
                      db: 'not-medic',
                      getDoc: ({parent}) => getPregnancyHomeVisit(parent),
                    }
                  ]
                },
                {
                  designId: 'woman-person',
                  amount: 1,
                  db: 'not-medic',
                  getDoc: () => getWoman(context),
                  children: [
                    {
                      designId: 'pregnancy-danger-report',
                      amount: 1,
                      db: 'not-medic',
                      getDoc: ({parent}) => getPregnancyDangerSign(parent),
                    },
                    {
                      designId: 'pregnancy-report',
                      amount: 1,
                      db: 'not-medic',
                      getDoc: ({parent}) => pregnancyRegistration(parent),
                    },

                  ]
                },
                {
                  designId: 'child-person',
                  amount: 2,
                  db: 'not-medic',
                  getDoc: () => getChild(context),
                },
                {
                  designId: 'infant-person',
                  amount: 1,
                  db: 'not-medic',
                  getDoc: () => getInfant(context),
                  children: [
                    {
                      designId: 'pnc_danger_sign_follow_up_baby-report',
                      amount: 1,
                      db: 'not-medic',
                      getDoc: ({parent}) => getPNCDangerSignFollowUpBaby(parent),
                    },
                  ]
                },
                {
                  designId: 'patient-person',
                  amount: 2,
                  db: 'not-medic',
                  getDoc: () => getPatient(context),
                },
                {
                  designId: 'patient-person',
                  amount: 1,
                  db: 'not-medic',
                  getDoc: () => getPatient(context),
                  children: [
                    {
                      designId: 'death-report',
                      amount: 1,
                      db: 'not-medic',
                      getDoc: ({parent}) => deathReport(parent),
                    }
                  ]
                }
              ]
            },
          ]
        },
      ]
    },
  ];
};
