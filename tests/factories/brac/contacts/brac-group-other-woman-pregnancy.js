const Factory = require('rosie').Factory;
const Faker = require('@faker-js/faker');
const fpFlow = require('./brac-fp-flow');
const moment = require("moment");

module.exports = new Factory()
    .attr('married', Faker.faker.datatype.boolean())
    .attr('other_woman_pregnant', '')
    .attr('o_lmp', Faker.faker.datatype.boolean())
    .attr('o_lmp_start', ['o_lmp'], (oLmp) => {
        if (!oLmp) { return null; }
        else { return moment().subtract(Faker.faker.datatype.number({ min: 1, max: 9 }), "month").format('YYYY-MM-DD'); }
    })
    .attr('o_lmp_approx', ['o_lmp'], (oLmp) => {
        if (oLmp) { return null; }
        else { return Faker.faker.random.arrayElement(['2mo', '3mo', '4mo', '6mo', '8mo', '1mo']); }
    })
    .attr('p_test', ['o_lmp_approx'], (oLmpApprox) => {
        if (oLmpApprox !== '3mo' && oLmpApprox !== '3mo') { return null; }
        else { return Faker.faker.datatype.boolean(); }
    })
    .attr('p_test_result', ['p_test'], (pTest) => {
        if (!pTest) { return null; }
        else { return Faker.faker.random.arrayElement(['pos', 'neg']); }
    })
    .attr('p_test_kit', ['p_test'], (pTest) => {
        if (pTest) { return null; }
        else { return Faker.faker.datatype.boolean(); }
    })
    .attr('p_test_kit_result', ['p_test_kit'], (pTestKit) => {
        if (!pTestKit) { return null; }
        else { return Faker.faker.random.arrayElement(['pos', 'neg']); }
    })
    .attr('fp_flow', ['other_woman_pregnant'], (otherWomanPregnant) => {
        if (otherWomanPregnant) { return null; }
        else { return fpFlow.build(); }
    });