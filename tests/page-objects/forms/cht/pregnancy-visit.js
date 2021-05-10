const page1 = [
  {
    type: 'radio',
    css: 'input[name="/pregnancy_home_visit/pregnancy_summary/visit_option"]'
  },
  {
    type: 'radio',
    css: 'input[name="/pregnancy_home_visit/pregnancy_summary/g_age_correct"]'
  },
];

const page2 = [
  {
    type: 'radio',
    css: 'input[name="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/report_other_visits"]'
  }
];
const page3 = [
  {
    type: 'checkbox',
    css: 'input[name="/pregnancy_home_visit/anc_visits_hf/risk_factors/new_risks"]'
  },
  {
    type: 'radio',
    css: 'input[name="/pregnancy_home_visit/anc_visits_hf/risk_factors/additional_risk_check"]'
  }
];
const page4 = [
  {
    type: 'radio',
    css: 
      'input[name="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date_known"]'
  },
  {
    type: 'date',
    css: 'input[name="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date"]'
  }
];

const page5 = [];

const page6 = [
  {
    type: 'radio',
    css: 'input[name="/pregnancy_home_visit/danger_signs/vaginal_bleeding"]'
  },
  {
    type: 'radio',
    css: 'input[name="/pregnancy_home_visit/danger_signs/fits"]'
  },
  {
    type: 'radio',
    css: 'input[name="/pregnancy_home_visit/danger_signs/severe_abdominal_pain"]'
  },
  {
    type: 'radio',
    css: 'input[name="/pregnancy_home_visit/danger_signs/severe_headache"]'
  },
  {
    type: 'radio',
    css: 'input[name="/pregnancy_home_visit/danger_signs/very_pale"]'
  },
  {
    type: 'radio',
    css: 'input[name="/pregnancy_home_visit/danger_signs/fever"]'
  },
  {
    type: 'radio',
    css: 'input[name="/pregnancy_home_visit/danger_signs/reduced_or_no_fetal_movements"]'
  },
  {
    type: 'radio',
    css: 'input[name="/pregnancy_home_visit/danger_signs/breaking_water"]'
  },
  {
    type: 'radio',
    css: 'input[name="/pregnancy_home_visit/danger_signs/easily_tired"]'
  },
  {
    type: 'radio',
    css: 'input[name="/pregnancy_home_visit/danger_signs/face_hand_swelling"]'
  },
  {
    type: 'radio',
    css: 'input[name="/pregnancy_home_visit/danger_signs/breathlessness"]'
  },
];

const page7 = [
  {
    type: 'radio',
    css: 'input[name="/pregnancy_home_visit/safe_pregnancy_practices/malaria/llin_use"]'
  }
];
const page8 = [
  {
    type: 'radio',
    css: 'input[name="/pregnancy_home_visit/safe_pregnancy_practices/iron_folate/iron_folate_daily"]'
  }
];
const page9 = [
  {
    type: 'radio',
    css: 'input[name="/pregnancy_home_visit/safe_pregnancy_practices/deworming/deworming_med"]'
  }
];

const page10 = [];

const page11 = [
  {
    type: 'radio',
    css: 'input[name="/pregnancy_home_visit/safe_pregnancy_practices/hiv_status/hiv_tested"]'
  }
];

module.exports = {
  pages: [
    page1, 
    page2, 
    page3, 
    page4, 
    page5, 
    page6, 
    page7, 
    page8, 
    page9, 
    page10,
    page11
  ]
};
