const chaiExclude = require('chai-exclude').default;
const chaiAsPromised = require('chai-as-promised').default;
const chai = require('chai');
const deepEqualInAnyOrder = require('deep-equal-in-any-order');
const sinonChai = require('sinon-chai').default;
global.expect = chai.expect;

chai.use(chaiExclude);
chai.use(chaiAsPromised);
chai.use(deepEqualInAnyOrder);
chai.use(sinonChai);
