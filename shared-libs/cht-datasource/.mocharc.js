const chaiAsPromised = require('chai-as-promised');
const chai = require('chai');
const sinonChai = require('sinon-chai');
chai.use(chaiAsPromised);
chai.use(sinonChai);

module.exports = {
  require: 'ts-node/register'
};
