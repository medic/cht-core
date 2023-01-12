const Factory = require('rosie').Factory;
const Faker = require('@faker-js/faker');

module.exports = new Factory()
  .attr('safe_water', Faker.faker.datatype.boolean)
  .attr('source_of_drinking_water', ['safe_water'], (safe_water) => {
    if (!safe_water) {
      return null;
    }
    return Faker.faker.helpers.uniqueArray(
      ['boiling', 'filtration', 'chlorination', 'other'],
      Faker.faker.datatype.number({ min: 1, max: 4 })
    ).join(' ');
  })
  .attr('kitchen', Faker.faker.datatype.boolean)
  .attr('drying_rack', Faker.faker.datatype.boolean)
  .attr('rubbish_pit', Faker.faker.datatype.boolean)
  .attr('hygeinic_toilet', Faker.faker.datatype.boolean)
  .attr('mosquito_nets', Faker.faker.datatype.boolean);
