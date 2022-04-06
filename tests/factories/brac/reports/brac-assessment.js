const Factory = require('rosie').Factory;
const Faker = require('@faker-js/faker');
const moment = require('moment');

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
    let ageInYears = moment().subtract(patient.date_of_birth, 'year');
    return ageInYears;
  })
  .attr('patient_age_in_months', ['patient'], (patient) => {
    let ageInMonths = moment().subtract(patient.date_of_birth, 'month');
    return ageInMonths;
  })
  .attr('patient_age_in_days', ['patient'], (patient) => {
    let ageInDays = moment().subtract(patient.date_of_birth, 'day');
    return ageInDays;
  })
  .attr('patient_age_display',
    ['patient_age_in_years', 'patient_age_in_months'],
    (patientAgeInYears, patientAgeInMonths) => {
      let patientAgeDisplay = patientAgeInYears + ' years and ' + patientAgeInMonths % 12 + ' months';
      return patientAgeDisplay;
    })
  .attr('group_assess', () => {
    let isAlive = Faker.faker.random.arrayElement(['yes', 'no']);
    let deathDate = null;
    let deathCause = null;
    if (isAlive === 'no') {
      let amount = Faker.faker.datatype.number({ min: 1, max: 6 });
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
      if (patientAgeInMonths < 2 || patientAgeInYears >= 12 || groupAssess.is_alive === 'no') {
        return null;
      }
      let patientFever = Faker.faker.random.arrayElement(['yes', 'no']);
      let patientTemperature = null;
      let feverDuration = null;
      let mrdtTreated = null;
      let mrdtResult = null;
      let mrdtSource = null;
      let malariaTreatmentGiven = null;
      let malariaTreatment = null;
      let malariaPainkillerGiven = null;
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
      if (patientAgeInMonths < 2 || patientAgeInYears >= 12 || groupAssess.is_alive === 'no') {
        return null;
      }
      let patientCoughs = Faker.faker.random.arrayElement(['yes', 'no']);
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
      if (patientAgeInMonths < 2 || patientAgeInYears >= 12 || groupAssess.is_alive === 'no') {
        return null;
      } else if (groupCough.patient_coughs !== 'yes') {
        return null;
      }
      let breathCount = Faker.faker.datatype.number({ min: 10, max: 85 });
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
      if (patientAgeInMonths < 2 || patientAgeInYears >= 12 || groupAssess.is_alive === 'no') {
        return null;
      }
      let patientDiarrhea = Faker.faker.random.arrayElement(['yes', 'no']);
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
    });
