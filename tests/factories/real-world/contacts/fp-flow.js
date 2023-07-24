const Factory = require('rosie').Factory;
const Faker = require('@faker-js/faker');

const CONDOMS = 'condoms';
const BIRTH_CONTROL = ['iud', 'btl', 'emergency_pill', 'norplant', 'depoprovera', 'progesterone', 'dmpa', 'cop'];
const NONE = 'fp_none';

/**
 * Generates birth control method.
 * None cannot be selected along with the other options.
 * Condoms are the only family planning method combined with another family planning method.
 */
const generateFpMethods = () => {
  const methods = [];
  methods.push(Faker.faker.helpers.arrayElement([...BIRTH_CONTROL, CONDOMS, NONE]));
  if (methods[0] === CONDOMS) {
    methods.push(...Faker.faker.helpers.uniqueArray(
      BIRTH_CONTROL,
      Faker.faker.datatype.number({ min: 0, max: 1 })));
  }
  return methods.join(' ');
};
/**
 * fp-flow Factory generates Javascript object that represent Family Planning Workflow
 */
module.exports = new Factory()
  .attr('fp', Faker.faker.datatype.boolean())
  .attr('fp_method', ['fp'], (fp) => {
    if (fp) {
      return generateFpMethods();
    }
  })
  .attr('fp_enroll', ['fp', 'fp_method'], (fp, fpMethod) => {
    if (!fp || fpMethod === NONE) {
      return Faker.faker.datatype.boolean();
    }
  })
  .attr('fp_method_choice', ['fp_enroll'], (fp_enroll) => {
    if (fp_enroll) {
      return generateFpMethods();
    }
  });
