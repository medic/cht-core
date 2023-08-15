const Factory = require('rosie').Factory;
const Faker = require('@faker-js/faker');
const moment = require('moment');

const YES_NO = ['yes', 'no'];
const POSITIVE_NEGATIVE = ['pos', 'neg'];
const LAST_FOOD = ['meat', 'eggs', 'milk'];
const NONE = 'none';
const DURATION_OF_PREGNANCY_IN_DAYS = 279;
const UP_TO_2_MONTHS_AGO = 61;
const UP_TO_3_MONTHS_AGO = 91;
const UP_TO_4_MONTHS_AGO = 122;
const BETWEEN_5_TO_6_MONTHS_AGO = 183;
const BETWEEN_7_TO_8_MONTHS_AGO = 244;

/**
 * Calculate if women is pregnant.
 * @param {string} edd the estimate delivery time
 * @param {number} lmpApprox the approximate start date of last menstrual cycle (possible values: 61,91,122,183,244)
 * @param {string} pregRes the results of the pregnancy test
 * @param {string} pregResKit the pregnancy kit results.
 */
const isPregnant = (edd, lmpApprox, pregRes, pregResKit) => {
  if (edd && lmpApprox !== UP_TO_2_MONTHS_AGO && lmpApprox !== UP_TO_3_MONTHS_AGO) {
    return true;
  }
  if (lmpApprox === UP_TO_4_MONTHS_AGO
    || lmpApprox === BETWEEN_5_TO_6_MONTHS_AGO
    || lmpApprox === BETWEEN_7_TO_8_MONTHS_AGO) {
    return true;
  }
  if (edd !== null && (pregRes === 'pos' || pregResKit === 'pos')) {
    return true;
  }
  return false;
};

module.exports = new Factory()
  .option('patient', '')
  .option('contact', '')
  .attr('inputs', ['patient'], (patient) => {
    const inputContact = {
      _id: patient._id,
      name: patient.name,
      date_of_birth: patient.date_of_birth,
      sex: patient.sex,
      parent: { _id: patient.parent._id }
    };
    const input = {
      meta: '',
      source: 'contact',
      source_id: '',
      contact: inputContact
    };
    return input;
  })
  .attr('patient_id', ['patient'], (patient) => {
    return patient._id;
  })
  .attr('patient_name', ['patient'], (patient) => {
    return patient.name;
  })
  .attr('visited_contact_uuid', ['contact'], (contact) => {
    return contact._id;
  })
  .attr('patient_age_in_years', ['patient'], (patient) => {
    return patient.age_years;
  })
  .attr('group_lmp', () => {
    const groupLmp = {
      g_lmp_method: Faker.faker.helpers.arrayElement(['calendar', 'approx']),
      g_lmp_calendar: null,
      g_lmp_approx: null,
      g_lmp_date_raw: null,
      g_lmp_date_8601: null,
      g_lmp_date: null,
      g_edd_8601: null,
      g_edd: null,
      g_preg_test: null,
      g_preg_res: null,
      g_preg_res_kit: null,
    };
    if (groupLmp.g_lmp_method === 'calendar') {
      groupLmp.g_lmp_calendar = moment()
        .subtract(Faker.faker.datatype.number({ min: 1, max: 9 }), 'month')
        .format('YYYY-MM-DD');
      groupLmp.g_lmp_date_raw = groupLmp.g_lmp_calendar;
      groupLmp.g_lmp_date_8601 = groupLmp.g_lmp_calendar;
      groupLmp.g_lmp_date = groupLmp.g_lmp_calendar;
    } else {
      groupLmp.g_lmp_approx = Faker.faker.helpers.arrayElement([UP_TO_2_MONTHS_AGO,
        UP_TO_3_MONTHS_AGO,
        UP_TO_4_MONTHS_AGO,
        BETWEEN_5_TO_6_MONTHS_AGO,
        BETWEEN_7_TO_8_MONTHS_AGO]);
      groupLmp.g_lmp_date_raw = moment().subtract(groupLmp.g_lmp_approx, 'day');
      groupLmp.g_lmp_date_8601 = moment().subtract(groupLmp.g_lmp_approx, 'day').format('YYYY-MM-DD');
      groupLmp.g_lmp_date = moment().subtract(groupLmp.g_lmp_approx, 'day').format('MMM D, YYYY');
    }
    groupLmp.g_edd_8601 = moment(groupLmp.g_lmp_date_8601).add(DURATION_OF_PREGNANCY_IN_DAYS, 'days');
    groupLmp.g_edd = groupLmp.g_edd_8601.format('MMM D, YYYY');
    if (groupLmp.g_lmp_approx === UP_TO_2_MONTHS_AGO || groupLmp.g_lmp_approx === UP_TO_3_MONTHS_AGO) {
      groupLmp.g_preg_test = Faker.faker.helpers.arrayElement(YES_NO);
    }
    if (groupLmp.g_preg_test === 'yes') {
      groupLmp.g_preg_res = Faker.faker.helpers.arrayElement(POSITIVE_NEGATIVE);
    } else {
      groupLmp.g_preg_res_kit = Faker.faker.helpers.arrayElement(POSITIVE_NEGATIVE);
    }
    return groupLmp;
  })
  .attr('group_llin_parity', ['group_lmp'], (groupLmp) => {
    if (isPregnant(groupLmp.g_edd, groupLmp.g_lmp_approx, groupLmp.g_preg_res, groupLmp.g_preg_res_kit)) {
      const groupLlinParity = {
        patient_llin: Faker.faker.helpers.arrayElement(YES_NO)
      };
      return groupLlinParity;
    }
  })
  .attr('group_anc_visit', ['group_lmp'], (groupLmp) => {
    if (isPregnant(groupLmp.g_edd, groupLmp.g_lmp_approx, groupLmp.g_preg_res, groupLmp.g_preg_res_kit)) {
      const groupAncVisit = {
        anc_visit: Faker.faker.helpers.arrayElement(YES_NO),
        anc_visit_repeat: null,
        prophylaxis_taken: Faker.faker.helpers.arrayElement(YES_NO),
        last_dose: null,
        last_dose_date: null,
        tt_imm: Faker.faker.helpers.arrayElement(YES_NO),
        tt_received: null,
        tt_date: null,
        given_mebendazole: Faker.faker.helpers.arrayElement(YES_NO)
      };
      if (groupAncVisit.anc_visit === 'yes') {
        const ancVisitRepeat = {
          anc_visit_completed: Faker.faker.helpers.arrayElement(
            ['anc_1', 'anc_2', 'anc_3', 'anc_4', 'anc_5', 'anc_6', 'anc_7', 'anc_8']
          ),
          g_anc_last_visit: moment().unix(),
          note_warning: '',
          g_anc_last_visit_epoch: null,
          bp_reading: Faker.faker.lorem.word()
        };
        ancVisitRepeat.g_anc_last_visit_epoch = moment(ancVisitRepeat.g_anc_last_visit).unix();
        groupAncVisit.anc_visit_repeat = ancVisitRepeat;
      }
      if (groupAncVisit.prophylaxis_taken === 'yes') {
        groupAncVisit.last_dose = Faker.faker.helpers.arrayElement(['ipt_1', 'ipt_2', 'ipt_3', 'ipt_4']);
        groupAncVisit.last_dose_date = moment()
          .subtract(Faker.faker.datatype.number({ min: 1, max: 120 }), 'month')
          .format('YYYY-MM-DD');
      }
      if (groupAncVisit.tt_imm === 'yes') {
        groupAncVisit.tt_received = Faker.faker.helpers.arrayElement(['tt_1', 'tt_2']);
        groupAncVisit.tt_date = moment()
          .subtract(Faker.faker.datatype.number({ min: 1, max: 120 }), 'month')
          .format('YYYY-MM-DD');

      }
      return groupAncVisit;
    }
  })
  .attr('g_nutrition_screening', ['group_lmp'], (groupLmp) => {
    if (isPregnant(groupLmp.g_edd, groupLmp.g_lmp_approx, groupLmp.g_preg_res, groupLmp.g_preg_res_kit)) {
      const gNutritionScreening = {
        muac_score: Faker.faker.datatype.number(),
        mother_weight: Faker.faker.datatype.number(),
        last_fed: Faker.faker.helpers.arrayElement(['1', '2', '3', '4', '5', '6', '7']),
        last_food: [],
        mother_hiv_status: Faker.faker.helpers.arrayElement(...POSITIVE_NEGATIVE, 'unknown', 'undisclosed'),
        mother_arv: null
      };
      if (Faker.faker.datatype.boolean()) {
        gNutritionScreening.last_food.push(
          Faker.faker.helpers.uniqueArray(LAST_FOOD, Faker.faker.datatype.number({ min: 1, max: 3 }))
        );
      } else {
        gNutritionScreening.last_food.push(NONE);
      }
      if (gNutritionScreening.mother_hiv_status === 'pos') {
        gNutritionScreening.mother_arv = Faker.faker.helpers.arrayElement(YES_NO);
      }
      return gNutritionScreening;
    }
  })
  /**
 * Risk Factors codes:
 * r1	First pregnancy
 * r2	More than 4 children
 * r3	Last baby born less than 1 year before
 * r4	Had previous miscarriages or previous difficulties in childbirth
 * r5	Has any of the following conditions: heart conditions, asthma, high blood pressure, known diabetes
 * r6	HIV positive
 * r7	Is gravida 4+
 * r8	None
 */
  .attr('group_risk_factors', ['group_lmp'], (groupLmp) => {
    if (isPregnant(groupLmp.g_edd, groupLmp.g_lmp_approx, groupLmp.g_preg_res, groupLmp.g_preg_res_kit)) {
      const groupRiskFactors = {
        gravida: Faker.faker.datatype.number({ min: 0, max: 4 }),
        parity: null,
        g_risk_factors: []
      };
      groupRiskFactors.parity = Faker.faker.datatype.number({ min: 0, max: groupRiskFactors.gravida });
      const noRisk = Faker.faker.datatype.boolean();
      if (noRisk) {
        groupRiskFactors.g_risk_factors.push('r8');
      } else {
        const firstPregnancy = Faker.faker.datatype.boolean();
        if (firstPregnancy) {
          groupRiskFactors.g_risk_factors.push(Faker.faker.helpers.uniqueArray(
            ['r5', 'r6'],
            Faker.faker.datatype.number({ min: 0, max: 2 })
          ));
        } else {
          groupRiskFactors.g_risk_factors.push(Faker.faker.helpers.uniqueArray(
            ['r2', 'r3', 'r4', 'r5', 'r6', 'r7'],
            Faker.faker.datatype.number({ min: 0, max: 6 })
          ));
        }
      }
      return groupRiskFactors;
    }
  })
  .attr('group_danger_signs', ['group_lmp'], (groupLmp) => {
    if (isPregnant(groupLmp.g_edd, groupLmp.g_lmp_approx, groupLmp.g_preg_res, groupLmp.g_preg_res_kit)) {
      const groupDangerSigns = {
        g_danger_signs: Faker.faker.helpers.uniqueArray(['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9'],
          Faker.faker.datatype.number({ min: 0, max: 9 }))
      };
      return groupDangerSigns;
    }
  })
  .attr('lmp_method', ['group_lmp'], (groupLmp) => {
    return groupLmp.g_lmp_method;
  })
  .attr('lmp_date_8601', ['group_lmp'], (groupLmp) => {
    return groupLmp.g_lmp_date_8601;
  })
  .attr('lmp_date', ['group_lmp'], (groupLmp) => {
    return groupLmp.g_lmp_date;
  })
  .attr('edd_8601', ['group_lmp'], (groupLmp) => {
    return groupLmp.g_edd_8601;
  })
  .attr('edd', ['group_lmp'], (groupLmp) => {
    return groupLmp.g_edd;
  })
  .attr('risk_factors', ['group_risk_factors'], (groupRiskFactors) => {
    if (typeof (groupRiskFactors) !== 'undefined') {
      return groupRiskFactors.g_risk_factors;
    }
  })
  .attr('danger_signs', ['group_danger_signs'], (groupDangerSigns) => {
    if (groupDangerSigns) {
      return groupDangerSigns.g_danger_signs;
    }
  })
  .attr('anc_last_visit', ['group_anc_visit'], (groupAncVisit) => {
    if (groupAncVisit) {
      return groupAncVisit.g_anc_last_visit;
    }
  })
  .attr('anc_visit_identifier', '')
  .attr('anc_last_bp_reading', '')
  .attr('patient_age_at_lmp', ['patient', 'group_lmp'], (patient, groupLmp) => {
    const birthDate = moment(patient.date_of_birth);
    const lmpDate = moment(groupLmp.g_lmp_date_8601);
    return lmpDate.diff(birthDate, 'years');
  })
  .attr('days_since_lmp', ['group_lmp'], (groupLmp) => {
    const now = moment();
    const lmpDate = moment(groupLmp.g_lmp_date_8601);
    const daysDiff = now.diff(lmpDate, 'days');
    return daysDiff;
  })
  .attr('weeks_since_lmp', ['group_lmp'], (groupLmp) => {
    const now = moment();
    const lmpDate = moment(groupLmp.g_lmp_date_8601);
    const weeksDiff = now.diff(lmpDate, 'weeks');
    return weeksDiff;
  });
