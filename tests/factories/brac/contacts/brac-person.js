const Factory = require('rosie').Factory;
const uuid = require('uuid');
const Faker = require('@faker-js/faker');
const chpProfile = require('./chp-profile');
const groupOtherWomanPregnancy = require('./brac-group-other-woman-pregnancy');
const moment = require('moment');

const shouldGenerateSurvey = (person) => {
  return person.family_member_type === 'member_eligible_woman' || person.family_member_type === 'member_child';
}

const shouldGeneratePregnancySurvey = (person) => {
  return person.family_member_type === 'member_eligible_woman' && person.group_other_woman_pregnancy.other_woman_pregnant;
}

const shouldGenerateAssessmentSurvey = (person) => {
  return person.family_member_type === 'member_child';
}

const bracPerson = () => {
  return new Factory()
    .sequence('_id', uuid.v4)
    .option('subtype', 'manager')//manager | chw | member_child | member_eligible_woman | family_member
    .attr('parent', '')
    .attr('type', 'person')
    .attr('sex', ['subtype'], (subtype) => {
      if (subtype === 'member_eligible_woman') {
        return 'female';
      }
      if (subtype === 'family_member') {
        return 'male';
      } else {
        return Faker.faker.name.gender(true).toLowerCase();
      }
    })
    .attr('name', Faker.faker.name.findName())
    .attr('short_name', Faker.faker.name.firstName())
    .attr('date_of_birth_method', Faker.faker.random.arrayElement(['approx', 'calendar']))
    .attr('age_years', ['subtype', 'date_of_birth_method'], (subtype, dateOfBirthMethod) => {
      if (dateOfBirthMethod !== 'approx') {
        return null;
      }
      if (subtype === 'member_child') {
        return Faker.faker.datatype.number({ min: 0, max: 5 });
      }
      if (subtype === 'member_eligible_woman' || subtype === 'manager' || subtype === 'chw') {
        return Faker.faker.datatype.number({ min: 12, max: 52 });
 return Faker.faker.datatype.number({ min: 6, max: 80 });
    })
    .attr('age_months', ['date_of_birth_method'], (dateOfBirthMethod) => {
if (dateOfBirthMethod === 'approx') {
  return Faker.faker.datatype.number({ min: 0, max: 12 });
}
    })
    .attr('date_of_birth',
      ['subtype', 'date_of_birth_method', 'age_years', 'age_months'],
      (subtype, dateOfBirthMethod, ageYears, ageMonths) => {
        if (dateOfBirthMethod === 'approx') {
          const amount = ageYears * 12 + ageMonths;
          return moment().subtract(amount, 'months').format('YYYY-MM-DD');
        }
        if (subtype === 'member_child') {
          return moment().subtract(Faker.faker.datatype.number({ min: 1, max: 5 }), 'year').format('YYYY-MM-DD');
        }
        if (subtype === 'member_eligible_woman') {
          return moment().subtract(Faker.faker.datatype.number({ min: 12, max: 52 }), 'year').format('YYYY-MM-DD');
        } else {
          return moment().subtract(Faker.faker.datatype.number({ min: 18, max: 80 }), 'year').format('YYYY-MM-DD');
        }
      })
    .attr('phone', ['subtype'], (subtype) => {
      if (subtype === 'member_child') {
        return null;
      } else {
        return Faker.faker.phone.phoneNumber('+256#########');
      }
    })
    .attr('phone_alternate', ['subtype'], (subtype) => {
      if (subtype === 'member_child') {
        return null;
      } else {
        return Faker.faker.phone.phoneNumber('+256#########');
      }
    })
    .attr('notes', Faker.faker.lorem.sentence())
    .attr('patient_id', 'test')
    .attr('reported_date', () => Date.now())
    .attr('imported_date', () => moment().format('YYYY-MM-DD'))
    .attr('has_disability', Faker.faker.datatype.boolean())
    .attr('family_member_type', ['subtype'], (subtype) => {
      if (subtype !== 'member_child' && subtype !== 'member_eligible_woman') {
        return null;
      } else {
        return subtype;
      }
    })
    .attr('other_name', ['subtype'], (subtype) => {
      if (subtype !== 'chw') {
        return null;
      } else {
        return Faker.faker.name.firstName();
      }
    })
    .attr('patient_name', ['subtype', 'name'], (subtype, name) => {
      if (subtype !== 'chw') {
        return null;
      } else {
        return name;
      }
    })
    .attr('chp_id', ['subtype', '_id'], (subtype, _id) => {
      if (subtype !== 'chw') {
        return null;
      } else {
        return _id;
      }
    })
    .attr('chp_profile',
      ['subtype', 'date_of_birth', 'sex', 'phone', 'phone_alternate'],
      (subtype, dateOfBirth, sex, phone, phoneAlternate) => {
        if (subtype !== 'chw') {
          return null;
        } else {
          return chpProfile.build({},
            { dob: dateOfBirth, sex: sex, phone_number: phone, alternate_number: phoneAlternate });
        }
      })
    .attr('pregnant_at_registration', ['subtype'], (subtype) => {
      if (subtype !== 'member_eligible_woman') {
        return null;
      } else {
        return Faker.faker.datatype.boolean();
      }
    })
    .attr('group_other_woman_pregnancy', ['pregnant_at_registration', 'subtype'], (pregnantAtRegistration, subtype) => {
      if (subtype !== 'member_eligible_woman') {
        return null;
      } else {
        return groupOtherWomanPregnancy.build({ other_woman_pregnant: pregnantAtRegistration });
      }
    })
    .attr('c_name', ['subtype', 'name'], (subtype, name) => {
      if (subtype === 'chw' || subtype === 'manager') {
        return null;
      } else {
        return name;
      }
    })
    .attr('dob_method', ['subtype', 'date_of_birth_method'], (subtype, dateofBirthMethod) => {
      if (subtype === 'chw' || subtype === 'manager') {
        return null;
      } else {
        return dateofBirthMethod;
      }
    })
    .attr('ephemeral_months', ['subtype', 'date_of_birth'], (subtype, dateofBirth) => {
      if (subtype === 'chw' || subtype === 'manager') {
        return null;
      } else {
        return new Date(dateofBirth).getMonth() + 1;
      }
    })
    .attr('ephemeral_years', ['subtype', 'date_of_birth'], (subtype, dateofBirth) => {
      if (subtype === 'chw' || subtype === 'manager') {
        return null;
      }
      return new Date(dateofBirth).getFullYear();
    })
    .attr('dob_approx', ['subtype', 'date_of_birth'], (subtype, dateofBirth) => {
      if (subtype === 'chw' || subtype === 'manager') {
        return null;
      }
      return dateofBirth;
    })
    .attr('dob_raw', ['subtype', 'date_of_birth'], (subtype, dateofBirth) => {
      if (subtype === 'chw' || subtype === 'manager') {
        return null;
      }
      return dateofBirth;
    })
    .attr('c_dob_iso', ['subtype', 'date_of_birth'], (subtype, dateofBirth) => {
      if (subtype === 'chw' || subtype === 'manager') {
        return null;
      }
      return dateofBirth;
    })
    .attr('current_age', ['subtype', 'age_years'], (subtype, ageYears) => {
      if (subtype === 'chw' || subtype === 'manager') {
        return null;
      }
      return ageYears;
    })
    .attr('c_sex', ['subtype', 'sex'], (subtype, sex) => {
      if (subtype === 'chw' || subtype === 'manager') {
        return null;
      }
      return sex;
    });

};

const generateBracPerson = (parent, subtype) => {
  if (subtype === 'other') {
    subtype = Faker.faker.random.arrayElement(['member_child', 'member_eligible_woman', 'family_member']);
  }
  return bracPerson().build({
    parent: parent
  }, {
    subtype: subtype
  });
};

module.exports = {
  shouldGenerateSurvey,
  shouldGeneratePregnancySurvey,
  shouldGenerateAssessmentSurvey,
  generateBracPerson,
  bracPerson
};
