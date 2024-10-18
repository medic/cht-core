const chaiAsPromised = require('chai-as-promised');
const chai = require('chai');
chai.use(chaiAsPromised);

module.exports = {
  spec: 'tests/mocha/ts/**/*.spec.ts',
  require: 'ts-node/register',
};
