const Factory = require('rosie').Factory;
const uuid = require('uuid');
const Faker = require('@faker-js/faker');
const chpProfile = require('./chp-profile');
const groupOtherWomanPregnancy = require('./brac-group-other-woman-pregnancy');
const moment = require('moment');
const approxDateOfBirthMethod = 'approx';
const phoneNumberFormat = '+256414######';
const memberEligibleWoman = 'member_eligible_woman';
const memberChild = 'member_child';

const isChw = (subtype) => subtype === 'chw';
const isManager = (subtype) => subtype === 'manager';
const isFamilyMember = (subtype) => !isChw(subtype) && !isManager(subtype);
const isStaff = (subtype) => isChw(subtype) || isManager(subtype);

const shouldGenerateSurvey = (person) => {
  return person.family_member_type === memberEligibleWoman || person.family_member_type === memberChild;
};

const shouldGeneratePregnancySurvey = (person) => {
  return person.family_member_type === memberEligibleWoman && person.group_other_woman_pregnancy.other_woman_pregnant;
};

const shouldGenerateAssessmentSurvey = (person) => {
  return person.family_member_type === memberChild;
};

const getAgeInYears = (subtype) => {
  if (subtype === memberChild) {
    return Faker.faker.datatype.number({ min: 0, max: 5 });
  }
  if (subtype === memberEligibleWoman || isStaff(subtype)) {
    return Faker.faker.datatype.number({ min: 12, max: 52 });
  }
  return Faker.faker.datatype.number({ min: 6, max: 80 });
};

const bracPerson = () => {
  return new Factory()
    .sequence('_id', uuid.v4)
    .option('subtype', 'manager')
    .attr('parent', '')
    .attr('type', 'person')
    .attr('sex', ['subtype'], (subtype) => {
      if (subtype === memberEligibleWoman) {
        return 'female';
      }
      return Faker.faker.name.gender(true).toLowerCase();
    })
    .attr('name', Faker.faker.name.findName())
    .attr('short_name', Faker.faker.name.firstName())
    .attr('date_of_birth_method', Faker.faker.helpers.arrayElement([approxDateOfBirthMethod, 'calendar']))
    .attr('age_years', ['subtype', 'date_of_birth_method'], (subtype, dateOfBirthMethod) => {
      if (dateOfBirthMethod === approxDateOfBirthMethod) {
        return getAgeInYears(subtype);
      }
    })
    .attr('age_months', ['date_of_birth_method'], (dateOfBirthMethod) => {
      if (dateOfBirthMethod === approxDateOfBirthMethod) {
        return Faker.faker.datatype.number({ min: 0, max: 12 });
      }
    })
    .attr('date_of_birth',
      ['subtype', 'date_of_birth_method', 'age_years', 'age_months'],
      (subtype, dateOfBirthMethod, ageYears, ageMonths) => {
        if (dateOfBirthMethod === approxDateOfBirthMethod) {
          const ageInMonths = ageYears * 12 + ageMonths;
          return moment().subtract(ageInMonths, 'months').format('YYYY-MM-DD');
        }
        return moment().subtract(getAgeInYears(subtype), 'year').format('YYYY-MM-DD');
      })
    .attr('phone', ['subtype'], (subtype) => {
      if (subtype !== memberChild) {
        return Faker.faker.phone.phoneNumber(phoneNumberFormat);
      }
    })
    .attr('phone_alternate', ['subtype'], (subtype) => {
      if (subtype !== memberChild) {
        return Faker.faker.phone.phoneNumber(phoneNumberFormat);
      }
    })
    .attr('notes', Faker.faker.lorem.sentence())
    .attr('patient_id', Faker.faker.datatype.number({ min: 10000, max: 99999 }))
    .attr('reported_date', () => Date.now())
    .attr('has_disability', Faker.faker.datatype.boolean())
    .attr('family_member_type', ['subtype'], (subtype) => {
      if (isFamilyMember(subtype)) {
        return subtype;
      }
    })
    .attr('other_name', Faker.faker.name.firstName())
    .attr('patient_name', ['name'], (name) => {
      return name;
    })
    .attr('chp_id', ['subtype', '_id'], (subtype, _id) => {
      if (isChw(subtype)) {
        return _id;
      }
    })
    .attr('chp_profile',
      ['subtype', 'date_of_birth', 'sex', 'phone', 'phone_alternate'],
      (subtype, dateOfBirth, sex, phone, phoneAlternate) => {
        if (isChw(subtype)) {
          const chpData = { dob: dateOfBirth, sex: sex, phone_number: phone, alternate_number: phoneAlternate };
          return chpProfile.build({}, chpData);
        }
      })
    .attr('pregnant_at_registration', ['subtype'], (subtype) => {
      if (subtype === memberEligibleWoman) {
        return Faker.faker.datatype.boolean();
      }
    })
    .attr('group_other_woman_pregnancy', ['pregnant_at_registration', 'subtype'], (pregnantAtRegistration, subtype) => {
      if (subtype === memberEligibleWoman) {
        return groupOtherWomanPregnancy.build({ other_woman_pregnant: pregnantAtRegistration });
      }
    })
    .attr('c_name', ['subtype', 'name'], (subtype, name) => {
      if (isFamilyMember(subtype)) {
        return name;
      }
    })
    .attr('dob_method', ['subtype', 'date_of_birth_method'], (subtype, dateofBirthMethod) => {
      if (isFamilyMember(subtype)) {
        return dateofBirthMethod;
      }
    })
    .attr('ephemeral_months', ['subtype', 'date_of_birth'], (subtype, dateofBirth) => {
      if (isFamilyMember(subtype)) {
        return new Date(dateofBirth).getMonth() + 1;
      }
    })
    .attr('ephemeral_years', ['subtype', 'date_of_birth'], (subtype, dateofBirth) => {
      if (isFamilyMember(subtype)) {
        return new Date(dateofBirth).getFullYear();
      }
    })
    .attr('dob_approx', ['subtype', 'date_of_birth'], (subtype, dateofBirth) => {
      if (isFamilyMember(subtype)) {
        return dateofBirth;
      }
    })
    .attr('dob_raw', ['subtype', 'date_of_birth'], (subtype, dateofBirth) => {
      if (isFamilyMember(subtype)) {
        return dateofBirth;
      }
    })
    .attr('c_dob_iso', ['subtype', 'date_of_birth'], (subtype, dateofBirth) => {
      if (isFamilyMember(subtype)) {
        return dateofBirth;
      }
    })
    .attr('current_age', ['subtype', 'date_of_birth'], (subtype, dateOfBirth) => {
      if (isFamilyMember(subtype)) {
        return moment().diff(dateOfBirth, 'year');
      }
    })
    .attr('c_sex', ['subtype', 'sex'], (subtype, sex) => {
      if (isFamilyMember(subtype)) {
        return sex;
      }
    });

};

const generateBracPerson = (parent, subtype) => {
  if (subtype === 'other') {
    subtype = Faker.faker.helpers.arrayElement([memberChild, memberEligibleWoman, null]);
  }
  return bracPerson().build({ parent }, { subtype });
};

module.exports = {
  shouldGenerateSurvey,
  shouldGeneratePregnancySurvey,
  shouldGenerateAssessmentSurvey,
  generateBracPerson,
  bracPerson
};
