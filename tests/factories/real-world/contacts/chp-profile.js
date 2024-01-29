const Factory = require('rosie').Factory;
const Faker = require('@faker-js/faker');
const moment = require('moment');

module.exports = new Factory()
  .option('dob', '')
  .option('sex', '')
  .option('phone_number', '')
  .option('alternate_number', '')
  .attr('g_individual_info', ['dob', 'sex'], (dob, sex) => {
    const gIndividualInfo = {
      nin: Faker.faker.number.int(),
      district_of_residence: Faker.faker.location.city(),
      county: Faker.faker.location.county(),
      sub_county: Faker.faker.location.street(),
      parish: Faker.faker.location.direction(),
      village: Faker.faker.location.secondaryAddress(),
      dob: dob,
      sex: sex,
      marital_status: Faker.faker.helpers.arrayElement(['married', 'single', 'separated'])
    };
    return gIndividualInfo;
  })
  .attr('g_contact_info', ['phone_number', 'alternate_number'], (phone_number, alternate_number) => {
    const gContactInfo = {
      phone_number: phone_number,
      alternate_number: alternate_number,
      bank: Faker.faker.finance.accountNumber()
    };
    return gContactInfo;
  })
  .attr('g_position_info', () => {
    const gPositionInfo = {
      chw_type: Faker.faker.helpers.arrayElement(['rct', 'non_rct', 'vht']),
      start_date: moment().subtract(Faker.faker.number.int({ min: 1, max: 10 }, 'year')).format('YYYY-MM-DD'),
      facility_name: Faker.faker.person.firstName(),
      facility_level: Faker.faker.person.firstName(),
      villages_served: Faker.faker.person.firstName()
    };
    return gPositionInfo;
  })
  .attr('g_education', () => {
    const gEducation = {
      education_level: Faker.faker.helpers.arrayElement(
        ['basic', 'below_primary', 'primary_7', 'o_level', 'a_level', 'tertiary', 'diploma', 'degree']
      ),
      institution: Faker.faker.person.firstName(),
      completion_year: moment().subtract(Faker.faker.number.int({ min: 1, max: 10 }, 'year')).format('YYYY-MM-DD')
    };
    return gEducation;
  })
  .attr('g_language', () => {
    const gEducation = {
      speak_english: Faker.faker.datatype.boolean(),
      read_english: Faker.faker.datatype.boolean(),
      write_english: Faker.faker.datatype.boolean(),
      mother_tongue: 'spanish',
      other_languages: 'english'
    };
    return gEducation;
  })
  .attr('g_other_details', () => {
    const gOtherDetails = {
      incentives: Faker.faker.helpers.uniqueArray(
        ['bicycle', 'financial', 'mentorship', 'motorbike', 'phone', 'training', 'uniform', 'other'],
        Faker.faker.number.int({ min: 1, max: 8 })
      ),
      other_incentives: Faker.faker.lorem.word(),
      chp_services: Faker.faker.helpers.uniqueArray(
        ['disaster_risk', 'family_reproductive_health', 'first_aid', 'health_commodities', 'health_promotion',
          'hygiene', 'pmtct', 'prevention_communicable', 'prevention_non_communicable', 'vital_stat'],
        Faker.faker.number.int({ min: 1, max: 10 })
      )
    };
    return gOtherDetails;
  });
