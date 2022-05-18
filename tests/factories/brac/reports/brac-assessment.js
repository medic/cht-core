const Factory = require('rosie').Factory;
const Faker = require('@faker-js/faker');
const moment = require('moment');

const YES = 'yes';
const NO = 'no';
const YES_NO = [YES, NO];
const SYMPTOM_DURATION_DAYS = ['1', '2', '3', '7', '14', '21'];
const ONE_YEAR = 365;
const FIVE_YEARS = 5 * 365;
const DEWORMING_AND_VITAMINS = ['6', '12', '18', '24', '30', '36', '42', '48', '54', '60'];
const NONE = 'none';
const FOOD_EATEN = ['meat', 'eggs', 'powdered_milk'];
const BREAST_MILK = 'breast_milk';

const isNewborn = (patientAgeInMonths) => patientAgeInMonths < 2;
const is2moTo9mo = (patientAgeInMonths) => patientAgeInMonths >= 2 && patientAgeInMonths < 9;
const is9moTo18mo = (patientAgeInMonths) => patientAgeInMonths >= 9 && patientAgeInMonths < 18;

const isBreathingFast = (breathCount, patientAgeInDays) => {
  if ((breathCount >= 60 && patientAgeInDays < 60)
    || (breathCount >= 50 && patientAgeInDays >= 60 && patientAgeInDays < ONE_YEAR)
    || (breathCount >= 40 && patientAgeInDays >= ONE_YEAR && patientAgeInDays < FIVE_YEARS)
    || (breathCount >= 30 && patientAgeInDays >= FIVE_YEARS)) {
    return true;
  }
  return false;
};

const isAChildAndAlive = (maxAge, patientAgeInMonths, patientAgeInYears, isAlive) => {
  return (!isNewborn(patientAgeInMonths) && patientAgeInYears < maxAge && isAlive === YES);
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
    const ageInYears = moment().diff(patient.date_of_birth, 'years');
    return ageInYears;
  })
  .attr('patient_age_in_months', ['patient'], (patient) => {
    const ageInMonths = moment().diff(patient.date_of_birth, 'months');
    return ageInMonths;
  })
  .attr('patient_age_in_days', ['patient'], (patient) => {
    const ageInDays = moment().diff(patient.date_of_birth, 'days');
    return ageInDays;
  })
  .attr('patient_age_display',
    ['patient_age_in_years', 'patient_age_in_months'],
    (patientAgeInYears, patientAgeInMonths) => {
      const patientAgeDisplay = patientAgeInYears + ' years and ' + patientAgeInMonths % 12 + ' months';
      return patientAgeDisplay;
    })
  .attr('group_assess', () => {
    const groupAssess = {
      is_alive: Faker.faker.helpers.arrayElement(YES_NO),
      death_date: null,
      death_cause: null
    };
    if (groupAssess.is_alive === NO) {
      const amount = Faker.faker.datatype.number({ min: 1, max: 6 });
      groupAssess.death_date = moment().subtract(amount, 'months').format('YYYY-MM-DD');
      groupAssess.death_cause = Faker.faker.helpers
        .arrayElement(['diarrhoea', 'malaria', 'pneumonia', 'other']);
    }
    return groupAssess;
  })
  .attr('group_fever',
    ['patient_age_in_years', 'patient_age_in_months', 'group_assess'],
    (patientAgeInYears, patientAgeInMonths, groupAssess) => {
      if (!isAChildAndAlive(12, patientAgeInMonths, patientAgeInYears, groupAssess.is_alive)) {
        return null;
      }
      const groupFever = {
        patient_fever: Faker.faker.helpers.arrayElement(YES_NO),
        patient_temperature: null,
        fever_duration: null,
        mrdt_treated: null,
        mrdt_result: null,
        mrdt_source: null,
        malaria_treatment_given: null,
        malaria_treatment: null,
        malaria_painkiller_given: null
      };
      if (groupFever.patient_fever === YES) {
        groupFever.patient_temperature = Faker.faker.datatype.number({ min: 32, max: 45 });
        groupFever.fever_duration = Faker.faker.helpers.arrayElement(SYMPTOM_DURATION_DAYS);
        groupFever.mrdt_treated = Faker.faker.helpers.arrayElement(YES_NO);
        groupFever.mrdt_result = Faker.faker.helpers.arrayElement(['positive', 'negative', 'none']);
        if (groupFever.mrdt_result !== 'none') {
          groupFever.mrdt_source = Faker.faker.helpers.arrayElement(['chp', 'other']);
          if (groupFever.mrdt_result === 'positive') {
            groupFever.malaria_treatment_given = Faker.faker.helpers.arrayElement(YES_NO);
            if (groupFever.malaria_treatment_given === YES) {
              groupFever.malaria_treatment = 'act';
            } else {
              groupFever.malaria_painkiller_given = Faker.faker.helpers.arrayElement(YES_NO);
            }
          }
        }
      }
      return groupFever;
    })
  .attr('group_cough',
    ['patient_age_in_years', 'patient_age_in_months', 'group_assess'],
    (patientAgeInYears, patientAgeInMonths, groupAssess) => {
      if (isAChildAndAlive(12, patientAgeInMonths, patientAgeInYears, groupAssess.is_alive)) {
        const groupCough = {
          patient_coughs: Faker.faker.helpers.arrayElement(YES_NO),
          coughing_duration: null,
          chest_indrawing: null
        };
        if (groupCough.patient_coughs === YES) {
          groupCough.coughing_duration = Faker.faker.helpers.arrayElement(SYMPTOM_DURATION_DAYS);
          groupCough.chest_indrawing = Faker.faker.helpers.arrayElement(YES_NO);
        }
        return groupCough;
      }
    })
  .attr('group_breathing',
    ['patient_age_in_years', 'patient_age_in_months', 'patient_age_in_days', 'group_assess', 'group_cough'],
    (patientAgeInYears, patientAgeInMonths, patientAgeInDays, groupAssess, groupCough) => {
      if (isAChildAndAlive(5, patientAgeInMonths, patientAgeInYears, groupAssess.is_alive)
        && groupCough.patient_coughs === YES) {
        const groupBreathing = {
          breath_count: Faker.faker.datatype.number({ min: 10, max: 85 }),
          fast_breathing: null,
          pneumonia_treatment_given: null,
          pneumonia_treatment: null
        };
        groupBreathing.fast_breathing = isBreathingFast(groupBreathing.breath_count, patientAgeInDays);
        if (groupBreathing.fast_breathing) {
          groupBreathing.pneumonia_treatment_given = Faker.faker.helpers.arrayElement(YES_NO);
        }
        if (groupBreathing.pneumonia_treatment_given === YES) {
          groupBreathing.pneumonia_treatment = 'amoxicillin';
        }
        return groupBreathing;
      }
    })
  .attr('group_diarrhea',
    ['patient_age_in_years', 'patient_age_in_months', 'group_assess'],
    (patientAgeInYears, patientAgeInMonths, groupAssess) => {
      if (isAChildAndAlive(12, patientAgeInMonths, patientAgeInYears, groupAssess.is_alive)) {
        const groupDiarrhea = {
          patient_diarrhea: Faker.faker.helpers.arrayElement(YES_NO),
          diarrhea_duration: null,
          diarrhea_blood: null,
          diarrhea_treatment_given: null,
          diarrhea_treatment: null
        };
        if (groupDiarrhea.patient_diarrhea === YES) {
          groupDiarrhea.diarrhea_duration = Faker.faker.helpers.arrayElement(SYMPTOM_DURATION_DAYS);
          groupDiarrhea.diarrhea_blood = Faker.faker.helpers.arrayElement(YES_NO);
          groupDiarrhea.diarrhea_treatment_given = Faker.faker.helpers.arrayElement(YES_NO);
          if (groupDiarrhea.diarrhea_treatment_given === YES) {
            groupDiarrhea.diarrhea_treatment = Faker.faker.helpers.arrayElement(['ors', 'zinc']);
          }
        }
        return groupDiarrhea;
      }
    })
  .attr('group_danger_signs',
    ['patient_age_in_years', 'patient_age_in_months', 'group_assess'],
    (patientAgeInYears, patientAgeInMonths, groupAssess) => {
      if (isAChildAndAlive(12, patientAgeInMonths, patientAgeInYears, groupAssess.is_alive)) {
        const groupDangerSigns = {
          danger_signs: Faker.faker.helpers.uniqueArray(
            ['convulsions', 'unable_to_feed', 'vomits_everything', 'very_sleepy', 'chest_indrawing'],
            Faker.faker.datatype.number({ min: 1, max: 5 }))
        };
        return groupDangerSigns;
      }
    })
  .attr('group_imm',
    ['patient_age_in_years', 'patient_age_in_months', 'group_assess'],
    (patientAgeInYears, patientAgeInMonths, groupAssess) => {
      if (isAChildAndAlive(5, patientAgeInMonths, patientAgeInYears, groupAssess.is_alive)) {
        const groupImm = {
          group_imm_less_2mo: null,
          group_imm_2mo_9mo: null,
          group_imm_9mo_18mo: null
        };
        if (isNewborn(patientAgeInMonths)) {
          const groupImmLess2mo = {
            vaccines_received_2mo: Faker.faker.helpers.arrayElement(YES_NO),
            imm_current_2mo: null,
            imm_given_2mo: null
          };
          if (groupImmLess2mo.vaccines_received_2mo === YES) {
            groupImmLess2mo.imm_current_2mo = Faker.faker.helpers.arrayElement(YES_NO);
          }
          if (groupImmLess2mo.imm_current_2mo === YES) {
            groupImmLess2mo.imm_given_2mo = Faker.faker.helpers.uniqueArray(
              ['bcg', 'polio_0', 'polio_1', 'dpt_hib1', 'pcv_1', 'rota_1'],
              Faker.faker.datatype.number({ min: 1, max: 6 }));
          }
          groupImm.group_imm_less_2mo = groupImmLess2mo;
        }
        if (is2moTo9mo(patientAgeInMonths)) {
          const groupImm2mo9mo = {
            vaccines_received_9mo: Faker.faker.helpers.arrayElement(YES_NO),
            imm_current_9mo: null,
            imm_given_9mo: null
          };
          if (groupImm2mo9mo.vaccines_received_9mo === YES) {
            groupImm2mo9mo.imm_current_9mo = Faker.faker.helpers.arrayElement(YES_NO);
          }
          if (groupImm2mo9mo.imm_current_9mo === YES) {
            groupImm2mo9mo.imm_given_9mo = Faker.faker.helpers.uniqueArray(
              ['dpt_hib2', 'pcv_2', 'rota_2', 'dpt_hib3', 'pcv_3', 'rota_3'],
              Faker.faker.datatype.number({ min: 1, max: 6 }));
          }
          groupImm.group_imm_less_2mo = groupImm2mo9mo;
        }
        if (is9moTo18mo(patientAgeInMonths)) {
          const groupImm9mo18mo = {
            vaccines_received_18mo: Faker.faker.helpers.arrayElement(YES_NO),
            imm_current_18mo: null,
            imm_given_18mo: null
          };
          if (groupImm9mo18mo.vaccines_received_18mo === YES) {
            groupImm9mo18mo.imm_current_18mo = Faker.faker.helpers.arrayElement(YES_NO);
          }
          if (groupImm9mo18mo.imm_current_18mo === YES) {
            groupImm9mo18mo.imm_given_18mo = 'measles_1';
          }
          groupImm.group_imm_less_2mo = groupImm9mo18mo;
        }
        return groupImm;
      }
    })
  .attr('group_deworm_vit',
    ['patient_age_in_years', 'patient_age_in_months', 'group_assess'],
    (patientAgeInYears, patientAgeInMonths, groupAssess) => {
      if (isAChildAndAlive(5, patientAgeInMonths, patientAgeInYears, groupAssess.is_alive)) {
        const vitReceived = [];
        const dewormingReceived = [];
        if (patientAgeInMonths > 6) {
          if (Faker.faker.datatype.boolean()) {
            vitReceived.push(...Faker.faker.helpers.uniqueArray(DEWORMING_AND_VITAMINS,
              Faker.faker.datatype.number({ min: 1, max: 10 })));
          } else {
            vitReceived.push(NONE);
          }
          if (Faker.faker.datatype.boolean()) {
            dewormingReceived.push(...Faker.faker.helpers.uniqueArray(DEWORMING_AND_VITAMINS,
              Faker.faker.datatype.number({ min: 1, max: 10 })));
          } else {
            dewormingReceived.push(NONE);
          }
        }
        const groupDewormVit = {
          vit_received: vitReceived.join(' '),
          deworming_received: dewormingReceived.join(' ')
        };
        return groupDewormVit;
      }
    })
  .attr('group_nutrition_assessment',
    ['patient_age_in_years', 'patient_age_in_months', 'group_assess'],
    (patientAgeInYears, patientAgeInMonths, groupAssess) => {
      if (isAChildAndAlive(5, patientAgeInMonths, patientAgeInYears, groupAssess.is_alive)) {
        const groupNutritionAssessment = {
          muac_score: Faker.faker.datatype.float({ min: 1, max: 500 }),
          child_weight: Faker.faker.datatype.float({ min: 1, max: 30 }),
          has_oedema: Faker.faker.helpers.arrayElement(YES_NO),
          micronutrient: null,
          num_satchets: null,
          buy_mpn: null,
          mpn_num: null,
          group_under_2yr: null,
          group_food_eaten: null
        };
        if ((patientAgeInMonths > 6 && patientAgeInMonths < 60)) {
          groupNutritionAssessment.micronutrient = Faker.faker.helpers.arrayElement(YES_NO);
          if (groupNutritionAssessment.micronutrient === YES) {
            groupNutritionAssessment.num_satchets = Faker.faker.datatype.number({ min: 1, max: 10 });
            if (groupNutritionAssessment.num_satchets < 10) {
              groupNutritionAssessment.buy_mpn = Faker.faker.helpers.arrayElement(YES_NO);
              if (groupNutritionAssessment.buy_mpn === YES) {
                groupNutritionAssessment.mpn_num = Faker.faker.datatype.number({ min: 1, max: 10 });
              }
            }
          }
          if (groupNutritionAssessment.micronutrient === NO) {
            groupNutritionAssessment.buy_mpn = Faker.faker.helpers.arrayElement(YES_NO);
            if (groupNutritionAssessment.buy_mpn === YES) {
              groupNutritionAssessment.mpn_num = Faker.faker.datatype.number({ min: 1, max: 10 });
            }
          }
        }
        if (patientAgeInMonths < 24) {
          groupNutritionAssessment.group_under_2yr = {
            breastfeeding: Faker.faker.helpers.arrayElement(YES_NO),
            breastfed_24hrs: null,
            times_breastfed: null
          };
          if (groupNutritionAssessment.group_under_2yr.breastfeeding === YES) {
            groupNutritionAssessment.group_under_2yr.breastfed_24hrs = Faker.faker.helpers.arrayElement(YES_NO);
            if (groupNutritionAssessment.group_under_2yr.breastfed_24hrs === YES) {
              groupNutritionAssessment.group_under_2yr.times_breastfed = Faker.faker.helpers
                .uniqueArray(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
                  Faker.faker.datatype.number({ min: 1, max: 10 }))
                .join(' ');
            }
          }
          if (patientAgeInMonths >= 6 && patientAgeInMonths < 12) {
            groupNutritionAssessment.group_food_eaten = {
              times_eaten: Faker.faker.helpers.arrayElement(
                ['0', '1', '2', '3', '4', '5', '6', 'gt_6']),
              food_eaten: []
            };
            if (Faker.faker.datatype.boolean()) {
              if (groupNutritionAssessment.group_under_2yr.breastfeeding === YES) {
                const foodEaten = Faker.faker.helpers
                  .uniqueArray([...FOOD_EATEN, BREAST_MILK], Faker.faker.datatype.number({ min: 1, max: 4 }));
                groupNutritionAssessment.group_food_eaten.food_eaten.push(...foodEaten);
              } else {
                groupNutritionAssessment.group_food_eaten.food_eaten.push(...Faker.faker.helpers.uniqueArray(
                  FOOD_EATEN, Faker.faker.datatype.number({ min: 1, max: 3 })));
              }
            } else {
              groupNutritionAssessment.group_food_eaten.food_eaten.push(NONE);
            }
          }
        }
        return groupNutritionAssessment;
      }
    })
  .attr('group_diagnosis',
    ['patient_age_in_years', 'patient_age_in_months', 'group_assess', 'group_cough', 'group_diarrhea', 'group_fever'],
    (patientAgeInYears, patientAgeInMonths, groupAssess, groupCough, groupDiarrhea, groupfever) => {
      if (isAChildAndAlive(12, patientAgeInMonths, patientAgeInYears, groupAssess.is_alive)) {
        const groupDiagnosis = {
          diagnosis_cough: null,
          diagnosis_diarrhea: null,
          diagnosis_fever: null
        };
        if (groupCough.patient_coughs === YES
          && groupCough.coughing_duration > 14
          && groupCough.chest_indrawing === YES) {
          groupDiagnosis.diagnosis_cough = 'pneumonia2c,cough2';
        }
        if (groupDiarrhea.patient_diarrhea === YES &&
          (groupDiarrhea.diarrhea_duration > 14 || groupDiarrhea.diarrhea_blood === YES)) {
          groupDiagnosis.diagnosis_diarrhea = 'diarrhea2,diarrhea1';
        }
        if (groupfever.patient_fever === YES || groupfever.patient_temperature > 37.5) {
          const seriousFever = (groupfever.fever_duration > 7 || groupfever.patient_temperature >= 40);
          const negativeMalaria = groupfever.mrdt_result === 'negative';
          if (seriousFever) {
            groupDiagnosis.diagnosis_fever = negativeMalaria ? 'fever2,fever1' : 'malaria2,malaria1';
          }
        }
        return groupDiagnosis;
      }
    });
