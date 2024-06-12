const chaiAsPromised = require('chai-as-promised');
const chai = require('chai');
chai.use(chaiAsPromised);

module.exports = {
  require: 'ts-node/register'
};
