const Factory = require('rosie').Factory;
const uuid = require('uuid');
const Faker = require('@faker-js/faker');
const householdSurveyFactory = require('../reports/create-family-household-survey');
const { CONTACT_TYPES } = require('@medic/constants');

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
      if (type === CONTACT_TYPES.CLINIC) {
        return Faker.faker.location.latitude() + ' ' + Faker.faker.location.longitude();
      }
      return null;
    })
    .attr('supervisor', '')
    .attr('household_survey', ['type'], (type) => {
      if (type === CONTACT_TYPES.CLINIC) {
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
