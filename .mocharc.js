const chaiExclude = require('chai-exclude');
const chaiAsPromised = require('chai-as-promised');
const chai = require('chai');
const deepEqualInAnyOrder = require('deep-equal-in-any-order');
global.expect = chai.expect;

chai.use(chaiExclude);
chai.use(chaiAsPromised);
chai.use(deepEqualInAnyOrder);
