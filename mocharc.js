const chaiExclude = require('chai-exclude');
const chaiAsPromised = require('chai-as-promised');
const chai = require('chai');
const deepEqualInAnyOrder = require('deep-equal-in-any-order');
const sinon = require('sinon');

chai.use(chaiExclude);
chai.use(chaiAsPromised);
chai.use(deepEqualInAnyOrder);
chai.use(require('chai-shallow-deep-equal'));
global.expect = chai.expect;
global.chai = chai;
global.sinon = sinon;

module.exports = {
  allowUncaught: false,
  color: true,
  checkLeaks: false,
  fullTrace: true,
  asyncOnly: false,
  reporter: 'spec',
  exit: true,
};
