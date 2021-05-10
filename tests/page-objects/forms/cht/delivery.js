const page1 = [
  {
    type: 'radio',
    css: 'input[name="/delivery/condition/woman_outcome"]'
  }
];

const page2 = [
  {
    type: 'radio',
    css: 'input[name="/delivery/pnc_danger_sign_check/fever"]'
  },
  {
    type: 'radio',
    css: 'input[name="/delivery/pnc_danger_sign_check/severe_headache"]'
  },
  {
    type: 'radio',
    css: 'input[name="/delivery/pnc_danger_sign_check/vaginal_bleeding"]'
  },
  {
    type: 'radio',
    css: 'input[name="/delivery/pnc_danger_sign_check/vaginal_discharge"]'
  },
  {
    type: 'radio',
    css: 'input[name="/delivery/pnc_danger_sign_check/convulsion"]'
  },
];

const page3 = [
  {
    type: 'radio',
    css: 'input[name="/delivery/delivery_outcome/babies_delivered"]'
  },
  {
    type: 'radio',
    css: 'input[name="/delivery/delivery_outcome/babies_alive"]'
  },
  {
    type: 'date',
    css: 'input[name="/delivery/delivery_outcome/delivery_date"]'
  },
  {
    type: 'radio',
    css: 'input[name="/delivery/delivery_outcome/delivery_place"]'
  },
  {
    type: 'text',
    css: 'input[name="/delivery/delivery_outcome/delivery_place_other"]'
  },
  {
    type: 'radio',
    css: 'input[name="/delivery/delivery_outcome/delivery_conductor"]'
  },
  {
    type: 'radio',
    css: 'input[name="/delivery/delivery_outcome/delivery_mode"]'
  },
];

const page4 = [
  {
    type: 'radio',
    css: 'input[data-name="/delivery/babys_condition/baby_repeat/baby_details/baby_condition"]'
  },
  {
    type: 'text',
    css: 'input[name="/delivery/babys_condition/baby_repeat/baby_details/baby_name"]'
  },
  {
    type: 'radio',
    css: 'input[data-name="/delivery/babys_condition/baby_repeat/baby_details/baby_sex"]'
  },
  {
    type: 'radio',
    css: 'input[data-name="/delivery/babys_condition/baby_repeat/baby_details/birth_weight_know"]'
  },
  {
    type: 'text',
    css: 'input[name="/delivery/babys_condition/baby_repeat/baby_details/birth_weight"]'
  },  
  {
    type: 'radio',
    css: 'input[data-name="/delivery/babys_condition/baby_repeat/baby_details/birth_length_know"]'
  },
  {
    type: 'text',
    css: 'input[name="/delivery/babys_condition/baby_repeat/baby_details/birth_length"]'
  },
  {
    type: 'radio',
    css: 'input[data-name="/delivery/babys_condition/baby_repeat/baby_details/vaccines_received"]'
  },
  {
    type: 'radio',
    css: 'input[data-name="/delivery/babys_condition/baby_repeat/baby_details/breatfeeding"]'
  },
  {
    type: 'radio',
    css: 'input[data-name="/delivery/babys_condition/baby_repeat/baby_details/breastfed_within_1_hour"]'
  },
  {
    type: 'radio',
    css: 'input[data-name="/delivery/babys_condition/baby_repeat/baby_details/infected_umbilical_cord"]'
  },
  {
    type: 'radio',
    css: 'input[data-name="/delivery/babys_condition/baby_repeat/baby_details/convulsion"]'
  },
  {
    type: 'radio',
    css: 'input[data-name="/delivery/babys_condition/baby_repeat/baby_details/difficulty_feeding"]'
  },
  {
    type: 'radio',
    css: 'input[data-name="/delivery/babys_condition/baby_repeat/baby_details/vomit"]'
  },
  {
    type: 'radio',
    css: 'input[data-name="/delivery/babys_condition/baby_repeat/baby_details/drowsy"]'
  },
  {
    type: 'radio',
    css: 'input[data-name="/delivery/babys_condition/baby_repeat/baby_details/stiff"]'
  },
  {
    type: 'radio',
    css: 'input[data-name="/delivery/babys_condition/baby_repeat/baby_details/yellow_skin"]'
  },
  {
    type: 'radio',
    css: 'input[data-name="/delivery/babys_condition/baby_repeat/baby_details/fever"]'
  },
  {
    type: 'radio',
    css: 'input[data-name="/delivery/babys_condition/baby_repeat/baby_details/blue_skin"]'
  }
];
const page5 = [];
const page6 = [
  {
    type: 'checkbox',
    css: 'input[name="/delivery/pnc_visits/pnc_visits_attended"]'
  },
  {
    type: 'text',
    css: 'input[name="/delivery/pnc_visits/pnc_visits_additional"]'
  },
];



module.exports = {
  pages: [
    page1, 
    page2, 
    page3, 
    page4, 
    page5, 
    page6
  ]
};
