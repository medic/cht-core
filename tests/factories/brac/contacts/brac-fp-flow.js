const Factory = require('rosie').Factory;
const Faker = require('@faker-js/faker');

const CONDOMS = 'condoms';
const BIRTH_CONTROL = ['iud', 'btl', 'emergency_pill', 'norplant', 'depoprovera', 'progesterone', 'dmpa', 'cop'];
const NONE = 'fp_none';

module.exports = new Factory()
  .attr('fp', Faker.faker.datatype.boolean())
  .attr('fp_method', ['fp'], (fp) => {
    if (fp) {
      const methods = [];
      methods.push(Faker.faker.random.arrayElement([...BIRTH_CONTROL, CONDOMS, NONE]));
      //If the selected birth control method is "condoms", another one can be optionally selected
      if (methods[0] === CONDOMS) {
        methods.push(Faker.faker.helpers.uniqueArray(
          BIRTH_CONTROL,
          Faker.faker.datatype.number({ min: 0, max: 1 })).toString());
      }
      return methods.join(' ');
    }
  })
  .attr('fp_enroll', ['fp', 'fp_method'], (fp, fpMethod) => {
    if (!fp || fpMethod === NONE) {
      return Faker.faker.datatype.boolean();
    }
  })
  .attr('fp_method_choice', ['fp_enroll'], (fp_enroll) => {
    if (fp_enroll) {
      const methods = [];
      methods.push(Faker.faker.random.arrayElement([...BIRTH_CONTROL, CONDOMS, NONE]));
      //If the selected birth control method is "condoms", another one can be optionally selected
      if (methods[0] === CONDOMS) {
        methods.push(Faker.faker.helpers.uniqueArray(
          BIRTH_CONTROL,
          Faker.faker.datatype.number({ min: 0, max: 1 })).toString());
      }
      return methods.join(' ');
    }
  });
