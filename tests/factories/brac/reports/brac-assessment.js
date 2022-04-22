const Factory = require('rosie').Factory;
const Faker = require('@faker-js/faker');
const moment = require('moment');

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
    const isAlive = Faker.faker.random.arrayElement(['yes']);
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
      const patientFever = Faker.faker.random.arrayElement(['yes', 'no']);
    const groupFever = {
        patient_fever: Faker.faker.random.arrayElement(['yes', 'no']),
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
        patientTemperature = Faker.faker.datatype.number({ min: 32, max: 45 });
        feverDuration = Faker.faker.random.arrayElement(['1', '2', '3', '7', '14', '21']);
        mrdtTreated = Faker.faker.random.arrayElement(['yes', 'no']);
        mrdtResult = Faker.faker.random.arrayElement(['positive', 'negative', 'none']);
        if (mrdtResult !== 'none') {
          mrdtSource = Faker.faker.random.arrayElement(['chp', 'other']);
          if (mrdtResult === 'positive') {
            malariaTreatmentGiven = Faker.faker.random.arrayElement(['yes', 'no']);
            if (malariaTreatmentGiven === 'yes') {
              malariaTreatment = 'act';
            } else {
              malariaPainkillerGiven = Faker.faker.random.arrayElement(['yes', 'no']);
            }
          }
        }
      }
      const groupFever = {
        patient_fever: patientFever,
        patient_temperature: patientTemperature,
        fever_duration: feverDuration,
        mrdt_treated: mrdtTreated,
        mrdt_result: mrdtResult,
        mrdt_source: mrdtSource,
        malaria_treatment_given: malariaTreatmentGiven,
        malaria_treatment: malariaTreatment,
        malaria_painkiller_given: malariaPainkillerGiven
      };
      return groupFever;
    })
  .attr('group_cough',
    ['patient_age_in_years', 'patient_age_in_months', 'group_assess'],
    (patientAgeInYears, patientAgeInMonths, groupAssess) => {
      if (!isAChildAndAlive(12, patientAgeInMonths, patientAgeInYears, groupAssess.is_alive)) {
        return null;
      }
      const patientCoughs = Faker.faker.random.arrayElement(['yes', 'no']);
      let coughingDuration = null;
      let chestIndrawing = null;
      if (patientCoughs === 'yes') {
        coughingDuration = Faker.faker.random.arrayElement(['1', '2', '3', '7', '14', '21']);
        chestIndrawing = Faker.faker.random.arrayElement(['yes', 'no']);
      }
      const groupCough = {
        patient_coughs: patientCoughs,
        coughing_duration: coughingDuration,
        chest_indrawing: chestIndrawing
      };
      return groupCough;
    })
  .attr('group_breathing',
    ['patient_age_in_years', 'patient_age_in_months', 'patient_age_in_days', 'group_assess', 'group_cough'],
    (patientAgeInYears, patientAgeInMonths, patientAgeInDays, groupAssess, groupCough) => {
      if (!isAChildAndAlive(5, patientAgeInMonths, patientAgeInYears, groupAssess.is_alive)) {
        return null;
      } else if (groupCough.patient_coughs !== 'yes') {
        return null;
      }
      const breathCount = Faker.faker.datatype.number({ min: 10, max: 85 });
      let fastBreathing = false;
      let pneumoniaTreatmentGiven = null;
      let pneumoniaTreatment = null;
      if ((breathCount >= 60 && patientAgeInDays < 60)
        || (breathCount >= 50 && patientAgeInDays >= 60 && patientAgeInDays < 365)
        || (breathCount >= 40 && patientAgeInDays >= 365 && patientAgeInDays < 5 * 365)
        || (breathCount >= 30 && patientAgeInDays >= 5 * 365)) {
        fastBreathing = true;
      }
      if (fastBreathing) {
        pneumoniaTreatmentGiven = Faker.faker.random.arrayElement(['yes', 'no']);
      }
      if (pneumoniaTreatmentGiven === 'yes') {
        pneumoniaTreatment = 'amoxicillin';
      }
      const groupBreathing = {
        breath_count: breathCount,
        fast_breathing: fastBreathing,
        pneumonia_treatment_given: pneumoniaTreatmentGiven,
        pneumonia_treatment: pneumoniaTreatment
      };
      return groupBreathing;
    })
  .attr('group_diarrhea',
    ['patient_age_in_years', 'patient_age_in_months', 'group_assess'],
    (patientAgeInYears, patientAgeInMonths, groupAssess) => {
      if (!isAChildAndAlive(12, patientAgeInMonths, patientAgeInYears, groupAssess.is_alive)) {
        return null;
      }
      const patientDiarrhea = Faker.faker.random.arrayElement(['yes', 'no']);
      let diarrheaDuration = null;
      let diarrheaBlood = null;
      let diarrheaTreatmentGiven = null;
      let diarrheaTreatment = null;
      if (patientDiarrhea === 'yes') {
        diarrheaDuration = Faker.faker.random.arrayElement(['1', '2', '3', '7', '14', '21']);
        diarrheaBlood = Faker.faker.random.arrayElement(['yes', 'no']);
        diarrheaTreatmentGiven = Faker.faker.random.arrayElement(['yes', 'no']);
        if (diarrheaTreatmentGiven === 'yes') {
          diarrheaTreatment = Faker.faker.random.arrayElement(['ors', 'zinc']);
        }
      }
      const groupDiarrhea = {
        patient_diarrhea: patientDiarrhea,
        diarrhea_duration: diarrheaDuration,
        diarrhea_blood: diarrheaBlood,
        diarrhea_treatment_given: diarrheaTreatmentGiven,
        diarrhea_treatment: diarrheaTreatment
      };
      return groupDiarrhea;
    })
  .attr('group_danger_signs',
    ['patient_age_in_years', 'patient_age_in_months', 'group_assess'],
    (patientAgeInYears, patientAgeInMonths, groupAssess) => {
      if (!isAChildAndAlive(12, patientAgeInMonths, patientAgeInYears, groupAssess.is_alive)) {
        return null;
      }
      const groupDangerSigns = {
        danger_signs: Faker.faker.helpers.uniqueArray(
          ['convulsions', 'unable_to_feed', 'vomits_everything', 'very_sleepy', 'chest_indrawing'],
          Faker.faker.datatype.number({ min: 1, max: 5 }))
      };
      return groupDangerSigns;
    })
  .attr('group_imm',
    ['patient_age_in_years', 'patient_age_in_months', 'group_assess'],
    (patientAgeInYears, patientAgeInMonths, groupAssess) => {
      if (!isAChildAndAlive(5, patientAgeInMonths, patientAgeInYears, groupAssess.is_alive)) {
        return null;
      }
      let groupImmLess2mo = null;
      let groupImm2mo9mo = null;
      let groupImm9mo18mo = null;

      if (patientAgeInMonths <= 2) {
        const vaccinesReceived2mo = Faker.faker.random.arrayElement(['yes', 'no']);
        const immCurrent2mo = null;
        let immGiven2mo = null;
        if (vaccinesReceived2mo === 'yes') {
          immGiven2mo = Faker.faker.random.arrayElement(['yes', 'no']);
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
        const vaccinesReceived9mo = Faker.faker.random.arrayElement(['yes', 'no']);
        let immCurrent9mo = null;
        let immGiven9mo = null;
        if (vaccinesReceived9mo === 'yes') {
          immCurrent9mo = Faker.faker.random.arrayElement(['yes', 'no']);
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
        const vaccinesReceived18mo = Faker.faker.random.arrayElement(['yes', 'no']);
        let immCurrent18mo = null;
        let immGiven18mo = null;
        if (vaccinesReceived18mo === 'yes') {
          immCurrent18mo = Faker.faker.random.arrayElement(['yes', 'no']);
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
    })
  .attr('group_deworm_vit',
    ['patient_age_in_years', 'patient_age_in_months', 'group_assess'],
    (patientAgeInYears, patientAgeInMonths, groupAssess) => {
      if (!isAChildAndAlive(5, patientAgeInMonths, patientAgeInYears, groupAssess.is_alive)) {
        return null;
      }
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
    })
  .attr('group_nutrition_assessment',
    ['patient_age_in_years', 'patient_age_in_months', 'group_assess'],
    (patientAgeInYears, patientAgeInMonths, groupAssess) => {
      if (!isAChildAndAlive(5, patientAgeInMonths, patientAgeInYears, groupAssess.is_alive)) {
        return null;
      }
      let groupUnder2yr = null;
      let groupFoodEaten = null;
      let micronutrient = null;
      let numSatchets = null;
      let buyMpn = null;
      let mpnNum = null;
      if ((patientAgeInMonths > 6 && patientAgeInMonths <= 59)) {
        micronutrient = Faker.faker.random.arrayElement(['yes', 'no']);
        if (micronutrient === 'yes') {
          numSatchets = Faker.faker.datatype.number({ min: 1, max: 10 });
        }
        if (micronutrient === 'no' || numSatchets < 10) {
          buyMpn = Faker.faker.random.arrayElement(['yes', 'no']);
          if (buyMpn === 'yes') {
            mpnNum = numSatchets = Faker.faker.datatype.number({ min: 1, max: 10 });
          }
        }
      }
      if (patientAgeInMonths < 24) {
        const breastfeeding = Faker.faker.random.arrayElement(['yes', 'no']);
        let breastfed24hrs = null;
        let timesBreastfed = null;
        if (breastfeeding === 'yes') {
          breastfed24hrs = Faker.faker.random.arrayElement(['yes', 'no']);
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
        has_oedema: Faker.faker.random.arrayElement(['yes', 'no']),
        micronutrient: micronutrient,
        num_satchets: numSatchets,
        buy_mpn: buyMpn,
        mpn_num: mpnNum,
        grou_under_2yr: groupUnder2yr,
        group_food_eaten: groupFoodEaten
      };
      return groupNutritionAssessment;
    })
  .attr('group_diagnosis',
    ['patient_age_in_years', 'patient_age_in_months', 'group_assess', 'group_cough', 'group_diarrhea', 'group_fever'],
    (patientAgeInYears, patientAgeInMonths, groupAssess, groupCough, groupDiarrhea, groupfever) => {
      if (!isAChildAndAlive(12, patientAgeInMonths, patientAgeInYears, groupAssess.is_alive)) {
        return null;
      }
      let diagnosisCough = '';
      if (groupCough.patient_coughs === 'yes') {
        if (groupCough.coughing_duration > 14) {
          if (groupCough.chest_indrawing === 'yes') {
            diagnosisCough = 'pneumonia2c,cough2';
          }
        }
      }
      let diagnosisDiarrhea = '';
      if (groupDiarrhea.patient_diarrhea === 'yes' &&
        (groupDiarrhea.diarrhea_duration > 14 || groupDiarrhea.diarrhea_blood === 'yes')) {
        diagnosisDiarrhea = 'diarrhea2,diarrhea1';
      }
      let diagnosisFever = '';
      if (groupfever.patient_fever === 'yes' || groupfever.patient_temperature > 37.5) {
        if (groupfever.mrdt_result === 'negative') {
          if (groupfever.fever_duration > 7 || groupfever.patient_temperature >= 40) {
            diagnosisFever = 'fever2,fever1';
          }
        } else {
          if (groupfever.fever_duration > 7 || groupfever.patient_temperature >= 40) {
            diagnosisFever = 'malaria2,malaria1';
          }
        }
      }
      const groupDiagnosis = {
        diagnosis_cough: diagnosisCough,
        diagnosis_diarrhea: diagnosisDiarrhea,
        diagnosis_fever: diagnosisFever
      };
      return groupDiagnosis;
    });
