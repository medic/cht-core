const page1 = [
  {
    type: 'radio',
    css: 'input[data-name="/pregnancy/gestational_age/register_method/lmp_method"]',
  }
];

const page2 = [
  {
    type: 'radio',
    css: 'input[data-name="/pregnancy/gestational_age/method_approx/lmp_approx"]'
  },
  {
    type: 'text',
    css: 'input[name="/pregnancy/gestational_age/method_approx/lmp_approx_weeks"]'
  }
];

const page3 = [];

const page4 = [
  {
    type: 'text',
    css: 'input[name="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_hf_count"]'
  }
];

const page5 = [
  {
    type: 'radio',
    css: 'input[data-name="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_date_ask_single"]'
  },
  {
    type: 'date',
    css: 'input[name="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_date_single"]'
  }
];

const page6 = [
  {
    type: 'radio',
    css: 'input[data-name="/pregnancy/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date_known"]'
  },
  {
    type: 'date',
    css: 'input[name="/pregnancy/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date"]'
  }
];
const page7 = [];

const page8 = [
  {
    type: 'radio',
    css: 'input[name="/pregnancy/risk_factors/risk_factors_history/first_pregnancy"]'
  },
  {
    type: 'radio',
    css: 'input[name="/pregnancy/risk_factors/risk_factors_history/previous_miscarriage"]'
  }
];

const page9 = [
  {
    type: 'checkbox',
    css: 'input[name="/pregnancy/risk_factors/risk_factors_present/secondary_condition"]'
  },
  {
    type: 'radio',
    css: 'input[name="/pregnancy/risk_factors/risk_factors_present/additional_risk_check"]'
  }
];

const page10 = [
  {
    type: 'radio',
    css: 'input[name="/pregnancy/danger_signs/vaginal_bleeding"]'
  },
  {
    type: 'radio',
    css: 'input[name="/pregnancy/danger_signs/fits"]'
  },
  {
    type: 'radio',
    css: 'input[name="/pregnancy/danger_signs/severe_abdominal_pain"]'
  },
  {
    type: 'radio',
    css: 'input[name="/pregnancy/danger_signs/severe_headache"]'
  },
  {
    type: 'radio',
    css: 'input[name="/pregnancy/danger_signs/very_pale"]'
  },
  {
    type: 'radio',
    css: 'input[name="/pregnancy/danger_signs/fever"]'
  },
  {
    type: 'radio',
    css: 'input[name="/pregnancy/danger_signs/reduced_or_no_fetal_movements"]'
  },
  {
    type: 'radio',
    css: 'input[name="/pregnancy/danger_signs/breaking_water"]'
  },
  {
    type: 'radio',
    css: 'input[name="/pregnancy/danger_signs/easily_tired"]'
  },
  {
    type: 'radio',
    css: 'input[name="/pregnancy/danger_signs/face_hand_swelling"]'
  },
  {
    type: 'radio',
    css: 'input[name="/pregnancy/danger_signs/breathlessness"]'
  },
];

const page11 = [
  {
    type: 'radio',
    css: 'input[name="/pregnancy/safe_pregnancy_practices/malaria/uses_llin"]'
  },
];

const page12 = [
  {
    type: 'radio',
    css: 'input[name="/pregnancy/safe_pregnancy_practices/iron_folate/iron_folate_daily"]'
  },
];

const page13 = [
  {
    type: 'radio',
    css: 'input[name="/pregnancy/safe_pregnancy_practices/deworming/deworming_med"]'
  },
];

const page14 = [];

const page15 = [
  {
    type: 'radio',
    css: 'input[name="/pregnancy/safe_pregnancy_practices/hiv_status/hiv_tested"]'
  },
];

const page16 = [
  {
    type: 'radio',
    css: 'input[name="/pregnancy/safe_pregnancy_practices/tetanus/tt_imm_received"]'
  },
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
    page11,
    page12,
    page13,
    page14,
    page15,
    page16
  ]
};

