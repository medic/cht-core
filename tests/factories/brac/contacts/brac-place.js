const Factory = require('rosie').Factory;
const uuid = require('uuid');
const Faker = require('@faker-js/faker');
const householdSurveyFactory = require('../reports/create-family-household-survey');

const bracPlace = () => {
  return new Factory()
    .sequence('_id', uuid.v4)
    .attr('parent', '')
    .attr('type', '')
    .attr('is_name_generated', 'true')
    .attr('name', '')
    .attr('external_id', '')
    .attr('notes', Faker.faker.lorem.sentence())
    .attr('reported_date', () => Date.now())
    .attr('contact', '')
    .attr('geolocation', ['type'], (type) => {
      if (type !== 'clinic') {
        return null;
      } else {
        return Faker.faker.address.latitude() + ' ' + Faker.faker.address.longitude();
      }
    })
    .attr('supervisor', '')
    .attr('household_survey', ['type'], (type) => {
      if (type !== 'clinic') {
        return null;
      } else {
        return householdSurveyFactory.build();
      }
    });
};

const generateBracPlace = (name, type, parent) => {
  return bracPlace().build({
    name: name,
    type: type,
    parent: parent
  });
};

module.exports = {
  generateBracPlace,
  bracPlace
};
