const chaiAsPromised = require('chai-as-promised').default;
const chai = require('chai');
const sinonChai = require('sinon-chai').default;
chai.use(chaiAsPromised);
chai.use(sinonChai);

module.exports = {
  require: 'ts-node/register'
};
