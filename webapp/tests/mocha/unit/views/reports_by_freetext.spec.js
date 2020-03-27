const _ = require('lodash');
const assert = require('chai').assert;
const utils = require('./utils');

const doc = {
  _id: '7383B568-4A6C-2C97-B463-3CC2630A562E',
  _rev: '1-ddec60a626c8f5b17b0f5fcdc2031c39',
  content: '<content field full of stuff>',
  'fields': {
    'inputs': {
      'source': 'task',
      source_id: '82CFA683-D6F5-3427-95C7-45D792EA5A08',
      t_lmp_date: '2015-09-23T07:00:00.000Z',
      contact: {
        _id: 'd57c76c42de8b76bfcc2c07956ce879f',
        name: 'Patient With A Problem',
        date_of_birth: '1985-03-24',
        sex: 'female',
        phone: '+254777888999',
        parent: {
          contact: {
            phone: '+254777888999'
          }
        }
      }
    },
    patient_age_in_years: '25',
    patient_contact_phone: '+254777888999',
    patient_id: 'd57c76c42de8b76bfcc2c07956ce879f',
    patient_name: 'Patient With A Problem',
    lmp_date: '2015-09-23T07:00:00.000Z',
    follow_up_method: 'in_person',
    delivery_plan_discussed: '',
    danger_signs: 'd7',
    referral_follow_up_needed: 'true',
    days_since_lmp: '271.69',
    weeks_since_lmp: '38.81',
    edd: 'Jun 29, 2016',
    p_note: '',
    group_followup_options: {
      g_follow_up_method: 'in_person',
      call_button: ''
    },
    group_danger_signs: {
      g_danger_signs: 'd7'
    },
    group_review: {
      submit: '',
      r_summary: '',
      r_pregnancy_details: '',
      r_referral: '',
      r_referral_note: '',
      r_danger_sign1: '',
      r_danger_sign2: '',
      r_danger_sign3: '',
      r_danger_sign4: '',
      r_danger_sign5: '',
      r_danger_sign6: '',
      r_danger_sign7: '',
      r_danger_sign8: '',
      r_danger_sign9: '',
      r_reminders: '',
      r_reminder_trim1: '',
      r_reminder_trim2: '',
      r_reminder_trim3: '',
      r_followup_instructions: 'Follow up in 1 day to ensure that patient goes to a health facility',
      r_followup: '',
      r_followup_note: ''
    },
    group_delivery_plan: {
      no_delivery_plan_discussed: '',
      delivery_plan: '',
      g_delivery_plan_discussed: ''
    },
    group_healthy_newborn_practices: {
      healthy_newborn_practices: '',
      submit: ''
    }
  },
  form: 'pregnancy_visit',
  type: 'data_record',
  content_type: 'xml',
  reported_date: 1466466049001,
  contact: {
    name: 'Robert',
    phone: '+254777111222',
    parent: {
      type: 'health_center',
      name: 'HippieLand CHP Area1',
      contact: {
        type: 'person',
        name: 'HippieLand CHP Area1 Person',
        phone: '+254702123123'
      },
      _id: '6850E77F-5FFC-9B01-8D5B-3D6E33DFA73E',
      _rev: '1-9ed31f1ee070eb64351c6f2a4f8dfe5c'
    },
    type: 'person',
    _id: 'DFEF75F5-4D25-EA47-8706-2B12500EFD8F',
    _rev: '1-4c6b5d0545c0aba0b5f9213cc29b4e14'
  },
  from: '+254777111222',
  hidden_fields: [
    'days_since_lmp',
    'weeks_since_lmp',
    'p_note',
    'group_followup_options',
    'group_danger_signs',
    'group_review',
    'group_delivery_plan',
    'group_healthy_newborn_practices'
  ]
};

describe('reports_by_freetext view', () => {

  it('indexes doc name', () => {
    // given
    const map = utils.loadView('medic-client', 'reports_by_freetext');

    // when
    const emitted = map(doc);

    // then
    // Keys are arrays, so flatten the array of arrays for easier asserts.
    const flattened = _.flattenDeep(emitted);
    assert.include(flattened, 'patient');
    assert.include(flattened, 'with');
    assert.include(flattened, 'problem');
  });

  it('indexes non-ascii doc name', () => {
    // given
    const map = utils.loadView('medic-client', 'reports_by_freetext');

    // when
    doc.name = 'बुद्ध Élève';
    const emitted = map(doc);

    // then
    // Keys are arrays, so flatten the array of arrays for easier asserts.
    const flattened = _.flattenDeep(emitted);
    assert.include(flattened, 'बुद्ध');
    assert.include(flattened, 'élève');
  });

  it('does not index words of less than 3 chars', () => {
    // given
    const map = utils.loadView('medic-client', 'reports_by_freetext');

    // when
    const emitted = map(doc);

    // then
    // Keys are arrays, so flatten the array of arrays for easier asserts.
    const flattened = _.flattenDeep(emitted);
    assert.notInclude(flattened, 'a');
  });

  it('does not index non-reports docs', () => {
    // given
    const map = utils.loadView('medic-client', 'reports_by_freetext');

    // when
    const emitted = map({
      type: 'person',
      name: 'do not index me'
    });

    // then
    // Keys are arrays, so flatten the array of arrays for easier asserts.
    assert.equal(emitted.length, 0);
  });
});
