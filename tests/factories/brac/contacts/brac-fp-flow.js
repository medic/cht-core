const Factory = require('rosie').Factory;
const Faker = require('@faker-js/faker');

module.exports = new Factory()
  .attr('fp', Faker.faker.datatype.boolean())
  .attr('fp_method', ['fp'], (fp) => {
    if (!fp) {
      return null;
    } else {
      const methods = [];
      methods.push(Faker.faker.random.arrayElement(
        ['iud', 'condoms', 'btl', 'emergency_pill', 'norplant', 'depoprovera', 'progesterone', 'dmpa', 'cop', 'fp_none']));
      if (methods[0] === 'condoms') {
        methods.push(Faker.faker.helpers.uniqueArray(
          ['iud', 'btl', 'emergency_pill', 'norplant', 'depoprovera', 'progesterone', 'dmpa', 'cop'],
          Faker.faker.datatype.number({ min: 0, max: 1 })));
      }
      return methods.toString().replace(',', ' ');
    }
  })
  .attr('fp_enroll', ['fp', 'fp_method'], (fp, fpMethod) => {
    if (fp || fpMethod !== 'fp_none') {
      return null;
    } else {
      return Faker.faker.datatype.boolean();
    }
  })
  .attr('fp_method_choice', ['fp_enroll'], (fp_enroll) => {
    if (!fp_enroll) {
      return null;
    } else {
      const methods = [];
      methods.push(Faker.faker.random.arrayElement(
        ['iud', 'condoms', 'btl', 'emergency_pill', 'norplant', 'depoprovera', 'progesterone', 'dmpa', 'cop']));
      if (methods[0] === 'condoms') {
        methods.push(Faker.faker.helpers.uniqueArray(
          ['iud', 'btl', 'emergency_pill', 'norplant', 'depoprovera', 'progesterone', 'dmpa', 'cop'],
          Faker.faker.datatype.number({ min: 0, max: 1 })));
      }
      return methods.toString().replace(',', ' ');
    }
  });
