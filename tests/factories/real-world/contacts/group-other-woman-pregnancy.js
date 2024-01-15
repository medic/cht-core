const Factory = require('rosie').Factory;
const Faker = require('@faker-js/faker');
const fpFlow = require('./fp-flow');
const moment = require('moment');
/**
 * group-other-woman-pregnancy Factory generates Javascript object that represent a survey to
 * determine if the created women is pregnant.
 * Terminology:
 * o_lmp: Last menstrual cycle date is known (true or false)
 * o_lmp_start: Start date of the last cycle
 * o_lmp_approx: Approximate date of last cycle
 * p_test: Pregnancy test done (true or false)
 * p_test_result: The results of the test (pos or neg)
 * p_test_kit: Use the preganancy kit to confirm pregnancy (true or false)
 * p_test_kit_result:	Administer the test. The results of the test (pos or neg)
 * fp_flow: If the woman is not pregnant. She is asked to complete the family planing workflow.
 */

const POSITIVE_NEGATIVE = ['pos', 'neg'];

module.exports = new Factory()
  .attr('married', Faker.faker.datatype.boolean())
  .attr('other_woman_pregnant', '')
  .attr('o_lmp', Faker.faker.datatype.boolean())
  .attr('o_lmp_start', ['o_lmp'], (oLmp) => {
    if (oLmp) {
      return moment().subtract(Faker.faker.datatype.number({ min: 1, max: 9 }), 'month').format('YYYY-MM-DD');
    }
  })
  .attr('o_lmp_approx', ['o_lmp'], (oLmp) => {
    if (!oLmp) {
      return Faker.faker.helpers.arrayElement(['2mo', '3mo', '4mo', '6mo', '8mo', '1mo']);
    }
  })
  .attr('p_test', ['o_lmp_approx'], (oLmpApprox) => {
    if (oLmpApprox === '2mo' || oLmpApprox === '3mo') {
      return Faker.faker.datatype.boolean();
    }
  })
  .attr('p_test_result', ['p_test'], (pTest) => {
    if (pTest) {
      return Faker.faker.helpers.arrayElement(POSITIVE_NEGATIVE);
    }
  })
  .attr('p_test_kit', ['p_test'], (pTest) => {
    if (!pTest) {
      return Faker.faker.datatype.boolean();
    }
  })
  .attr('p_test_kit_result', ['p_test_kit'], (pTestKit) => {
    if (pTestKit) {
      return Faker.faker.helpers.arrayElement(POSITIVE_NEGATIVE);
    }
  })
  .attr('fp_flow', ['other_woman_pregnant'], (otherWomanPregnant) => {
    if (!otherWomanPregnant) {
      return fpFlow.build();
    }
  });
