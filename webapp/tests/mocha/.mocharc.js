const chaiAsPromised = require('chai-as-promised');
const chai = require('chai');
chai.use(chaiAsPromised);

process.env.UNIT_TEST_ENV = '1';

module.exports = {
  spec: 'tests/mocha/unit/**/*.spec.*',
};
