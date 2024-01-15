const Factory = require('rosie').Factory;
const uuid = require('uuid');
const Faker = require('@faker-js/faker');
const householdSurveyFactory = require('../reports/create-family-household-survey');

const place = () => {
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
      if (type === 'clinic') {
        return Faker.faker.address.latitude() + ' ' + Faker.faker.address.longitude();
      }
      return null;
    })
    .attr('supervisor', '')
    .attr('household_survey', ['type'], (type) => {
      if (type === 'clinic') {
        return householdSurveyFactory.build();
      }
      return null;
    });
};

const generatePlace = (name, type, parent) => {
  return place().build({
    name: name,
    type: type,
    parent: parent
  });
};

module.exports = {
  generatePlace,
  place
};
