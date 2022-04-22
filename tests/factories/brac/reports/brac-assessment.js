const Factory = require('rosie').Factory;
const Faker = require('@faker-js/faker');
const moment = require('moment');

const YES_NO = ['yes', 'no'];
const DURATION = ['1', '2', '3', '7', '14', '21'];
const ONE_YEAR = 365;
const FIVE_YEARS = 5 * 365;

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
  const isNewborn = patientAgeInMonths < 2;
  return (!isNewborn && patientAgeInYears < maxAge && isAlive === 'yes');
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
    const isAlive = Faker.faker.random.arrayElement(YES_NO);
    let deathDate = null;
    let deathCause = null;
    if (isAlive === 'no') {
      const amount = Faker.faker.datatype.number({ min: 1, max: 6 });
      deathDate = moment().subtract(amount, 'months').format('YYYY-MM-DD');
      deathCause = Faker.faker.random
        .arrayElement(['diarrhoea', 'malaria', 'pneumonia', 'other']);
    }
    const groupAssess = {
      is_alive: isAlive,
      death_date: deathDate,
      death_cause: deathCause
    };
    return groupAssess;
  })
  .attr('group_fever',
    ['patient_age_in_years', 'patient_age_in_months', 'group_assess'],
    (patientAgeInYears, patientAgeInMonths, groupAssess) => {
      if (!isAChildAndAlive(12, patientAgeInMonths, patientAgeInYears, groupAssess.is_alive)) {
        return null;
      }
      const groupFever = {
        patient_fever: Faker.faker.random.arrayElement(YES_NO),
        patient_temperature: null,
        fever_duration: null,
        mrdt_treated: null,
        mrdt_result: null,
        mrdt_source: null,
        malaria_treatment_given: null,
        malaria_treatment: null,
        malaria_painkiller_given: null
      };
      if (patientFever === 'yes') {
        groupFever.patient_temperature = Faker.faker.datatype.number({ min: 32, max: 45 });
        groupFever.fever_duration = Faker.faker.random.arrayElement(DURATION);
        groupFever.mrdt_treated = Faker.faker.random.arrayElement(YES_NO);
        groupFever.mrdt_result = Faker.faker.random.arrayElement(['positive', 'negative', 'none']);
        if (mrdtResult !== 'none') {
          groupFever.mrdt_source = Faker.faker.random.arrayElement(['chp', 'other']);
          if (mrdtResult === 'positive') {
            groupFever.malaria_treatment_given = Faker.faker.random.arrayElement(YES_NO);
            if (malariaTreatmentGiven === 'yes') {
              groupFever.malaria_treatment = 'act';
            } else {
              groupFever.malaria_painkiller_given = Faker.faker.random.arrayElement(YES_NO);
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
          patient_coughs: Faker.faker.random.arrayElement(YES_NO),
          coughing_duration: null,
          chest_indrawing: null
        };
        if (groupCough.patient_coughs === 'yes') {
          groupCough.coughing_duration = Faker.faker.random.arrayElement(DURATION);
          groupCough.chest_indrawing = Faker.faker.random.arrayElement(YES_NO);
        }
        return groupCough;
      }
    })
  .attr('group_breathing',
    ['patient_age_in_years', 'patient_age_in_months', 'patient_age_in_days', 'group_assess', 'group_cough'],
    (patientAgeInYears, patientAgeInMonths, patientAgeInDays, groupAssess, groupCough) => {
      if (isAChildAndAlive(5, patientAgeInMonths, patientAgeInYears, groupAssess.is_alive)
        && groupCough.patient_coughs === 'yes') {
        const groupBreathing = {
          breath_count: Faker.faker.datatype.number({ min: 10, max: 85 }),
          fast_breathing: isBreathingFast(groupBreathing.breath_count, patientAgeInDays),
          pneumonia_treatment_given: null,
          pneumonia_treatment: null
        };
        if (groupBreathing.fast_breathing) {
          groupBreathing.pneumonia_treatment_given = Faker.faker.random.arrayElement(YES_NO);
        }
        if (groupBreathing.pneumonia_treatment_given === 'yes') {
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
          patient_diarrhea: Faker.faker.random.arrayElement(YES_NO),
          diarrhea_duration: null,
          diarrhea_blood: null,
          diarrhea_treatment_given: null,
          diarrhea_treatment: null
        };
        if (groupDiarrhea.patient_diarrhea === 'yes') {
          groupDiarrhea.diarrhea_duration = Faker.faker.random.arrayElement(DURATION);
          groupDiarrhea.diarrhea_blood = Faker.faker.random.arrayElement(YES_NO);
          groupDiarrhea.diarrhea_treatment_given = Faker.faker.random.arrayElement(YES_NO);
          if (groupDiarrhea.diarrhea_treatment_given === 'yes') {
            groupDiarrhea.diarrhea_treatment = Faker.faker.random.arrayElement(['ors', 'zinc']);
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
        let groupImmLess2mo = null;
        let groupImm2mo9mo = null;
        let groupImm9mo18mo = null;

        if (patientAgeInMonths <= 2) {
          const vaccinesReceived2mo = Faker.faker.random.arrayElement(YES_NO);
          const immCurrent2mo = null;
          let immGiven2mo = null;
          if (vaccinesReceived2mo === 'yes') {
            immGiven2mo = Faker.faker.random.arrayElement(YES_NO);
          }
          if (immCurrent2mo === 'yes') {
            immGiven2mo = Faker.faker.helpers.uniqueArray(
              ['bcg', 'polio_0', 'polio_1', 'dpt_hib1', 'pcv_1', 'rota_1'],
              Faker.faker.datatype.number({ min: 1, max: 6 }));
          }
          groupImmLess2mo = {
            vaccines_received_2mo: vaccinesReceived2mo,
            imm_current_2mo: immCurrent2mo,
            imm_given_2mo: immGiven2mo
          };
        }

        if (patientAgeInMonths > 2 && patientAgeInMonths <= 9) {
          const vaccinesReceived9mo = Faker.faker.random.arrayElement(YES_NO);
          let immCurrent9mo = null;
          let immGiven9mo = null;
          if (vaccinesReceived9mo === 'yes') {
            immCurrent9mo = Faker.faker.random.arrayElement(YES_NO);
          }
          if (immCurrent9mo === 'yes') {
            immGiven9mo = Faker.faker.helpers.uniqueArray(
              ['dpt_hib2', 'pcv_2', 'rota_2', 'dpt_hib3', 'pcv_3', 'rota_3'],
              Faker.faker.datatype.number({ min: 1, max: 6 }));
          }
          groupImm2mo9mo = {
            vaccines_received_9mo: vaccinesReceived9mo,
            imm_current_9mo: immCurrent9mo,
            imm_given_9mo: immGiven9mo
          };
        }

        if (patientAgeInMonths > 9 && patientAgeInMonths <= 18) {
          const vaccinesReceived18mo = Faker.faker.random.arrayElement(YES_NO);
          let immCurrent18mo = null;
          let immGiven18mo = null;
          if (vaccinesReceived18mo === 'yes') {
            immCurrent18mo = Faker.faker.random.arrayElement(YES_NO);
          }
          if (immCurrent18mo === 'yes') {
            immGiven18mo = 'measles_1';
          }
          groupImm9mo18mo = {
            vaccines_received_18mo: vaccinesReceived18mo,
            imm_current_18mo: immCurrent18mo,
            imm_given_18mo: immGiven18mo
          };
        }
        const groupImm = {
          group_imm_less_2mo: groupImmLess2mo,
          group_imm_2mo_9mo: groupImm2mo9mo,
          group_imm_9mo_18mo: groupImm9mo18mo
        };
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
          vitReceived.push(
            Faker.faker.random.arrayElement(
              ['none', '6', '12', '18', '24', '30', '36', '42', '48', '54', '60']));
          if (vitReceived[0] !== 'none') {
            vitReceived.push(Faker.faker.helpers.uniqueArray(
              ['6', '12', '18', '24', '30', '36', '42', '48', '54', '60'],
              Faker.faker.datatype.number({ min: 1, max: 10 })));
          }
        }
        dewormingReceived.push(
          Faker.faker.random.arrayElement(
            ['none', '6', '12', '18', '24', '30', '36', '42', '48', '54', '60']));
        if (dewormingReceived[0] !== 'none') {
          dewormingReceived.push(Faker.faker.helpers.uniqueArray(
            ['6', '12', '18', '24', '30', '36', '42', '48', '54', '60'],
            Faker.faker.datatype.number({ min: 1, max: 10 })));
        }
        const groupDewormVit = {
          vit_received: vitReceived.toString(),
          deworming_received: dewormingReceived.toString()
        };
        return groupDewormVit;
      }
    })
  .attr('group_nutrition_assessment',
    ['patient_age_in_years', 'patient_age_in_months', 'group_assess'],
    (patientAgeInYears, patientAgeInMonths, groupAssess) => {
      if (isAChildAndAlive(5, patientAgeInMonths, patientAgeInYears, groupAssess.is_alive)) {
        let groupUnder2yr = null;
        let groupFoodEaten = null;
        let micronutrient = null;
        let numSatchets = null;
        let buyMpn = null;
        let mpnNum = null;
        if ((patientAgeInMonths > 6 && patientAgeInMonths <= 59)) {
          micronutrient = Faker.faker.random.arrayElement(YES_NO);
          if (micronutrient === 'yes') {
            numSatchets = Faker.faker.datatype.number({ min: 1, max: 10 });
          }
          if (micronutrient === 'no' || numSatchets < 10) {
            buyMpn = Faker.faker.random.arrayElement(YES_NO);
            if (buyMpn === 'yes') {
              mpnNum = numSatchets = Faker.faker.datatype.number({ min: 1, max: 10 });
            }
          }
        }
        if (patientAgeInMonths < 24) {
          const breastfeeding = Faker.faker.random.arrayElement(YES_NO);
          let breastfed24hrs = null;
          let timesBreastfed = null;
          if (breastfeeding === 'yes') {
            breastfed24hrs = Faker.faker.random.arrayElement(YES_NO);
            if (breastfed24hrs === 'yes') {
              timesBreastfed = Faker.faker.helpers.uniqueArray(
                ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
                Faker.faker.datatype.number({ min: 1, max: 10 })).toString();
            }
          }
          groupUnder2yr = {
            breastfeeding: breastfeeding,
            breastfed_24hrs: breastfed24hrs,
            times_breastfed: timesBreastfed
          };
          if (patientAgeInMonths >= 6 && patientAgeInMonths < 12) {
            const foodEaten = [];
            if (breastfeeding === 'yes') {
              foodEaten.push(Faker.faker.random.arrayElement(
                ['none', 'meat', 'eggs', 'powdered_milk', 'breast_milk']));
            } else {
              foodEaten.push(Faker.faker.random.arrayElement(
                ['none', 'meat', 'eggs', 'powdered_milk']));
            }
            if (foodEaten[0] !== 'none') {
              foodEaten.push(Faker.faker.helpers.uniqueArray(
                ['6', '12', '18', '24', '30', '36', '42', '48', '54', '60'],
                Faker.faker.datatype.number({ min: 1, max: 10 })));
              if (breastfeeding === 'yes') {
                foodEaten.push(Faker.faker.helpers.uniqueArray(
                  ['meat', 'eggs', 'powdered_milk', 'breast_milk'],
                  Faker.faker.datatype.number({ min: 1, max: 4 })));
              } else {
                foodEaten.push(Faker.faker.helpers.uniqueArray(
                  ['meat', 'eggs', 'powdered_milk'],
                  Faker.faker.datatype.number({ min: 1, max: 3 })));
              }
            }
            groupFoodEaten = {
              times_eaten: Faker.faker.random.arrayElement(
                ['0', '1', '2', '3', '4', '5', '6', 'gt_6']),
              food_eaten: foodEaten.toString()
            };
          }
        }

        const groupNutritionAssessment = {
          muac_score: Faker.faker.datatype.float({ min: 1, max: 500 }),
          child_weight: Faker.faker.datatype.float({ min: 1, max: 30 }),
          has_oedema: Faker.faker.random.arrayElement(YES_NO),
          micronutrient: micronutrient,
          num_satchets: numSatchets,
          buy_mpn: buyMpn,
          mpn_num: mpnNum,
          grou_under_2yr: groupUnder2yr,
          group_food_eaten: groupFoodEaten
        };
        return groupNutritionAssessment;
      }
    })
  .attr('group_diagnosis',
    ['patient_age_in_years', 'patient_age_in_months', 'group_assess', 'group_cough', 'group_diarrhea', 'group_fever'],
    (patientAgeInYears, patientAgeInMonths, groupAssess, groupCough, groupDiarrhea, groupfever) => {
      if (isAChildAndAlive(12, patientAgeInMonths, patientAgeInYears, groupAssess.is_alive)) {
        let diagnosisCough = '';
        if (groupCough.patient_coughs === 'yes' && groupCough.coughing_duration > 14 && groupCough.chest_indrawing === 'yes') {
          diagnosisCough = 'pneumonia2c,cough2';
        }
        let diagnosisDiarrhea = '';
        if (groupDiarrhea.patient_diarrhea === 'yes' &&
          (groupDiarrhea.diarrhea_duration > 14 || groupDiarrhea.diarrhea_blood === 'yes')) {
          diagnosisDiarrhea = 'diarrhea2,diarrhea1';
        }
        let diagnosisFever = '';
        if (groupfever.patient_fever === 'yes' || groupfever.patient_temperature > 37.5) {
          const seriousFever = (groupfever.fever_duration > 7 || groupfever.patient_temperature >= 40);
          const negativeMalaria = groupfever.mrdt_result === 'negative';
          if (seriousFever) {
            diagnosisFever = negativeMalaria ? 'fever2,fever1' : 'malaria2,malaria1';
          }
        }
        const groupDiagnosis = {
          diagnosis_cough: diagnosisCough,
          diagnosis_diarrhea: diagnosisDiarrhea,
          diagnosis_fever: diagnosisFever
        };
        return groupDiagnosis;
      }
    });
