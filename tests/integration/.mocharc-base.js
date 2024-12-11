require('../aliases');
const chaiExclude = require('chai-exclude');
const chaiAsPromised = require('chai-as-promised');
const chai = require('chai');
const deepEqualInAnyOrder = require('deep-equal-in-any-order');

chai.use(chaiExclude);
chai.use(chaiAsPromised);
chai.use(deepEqualInAnyOrder);
chai.use(require('chai-shallow-deep-equal'));
global.expect = chai.expect;
global.chai = chai;

module.exports = {
  allowUncaught: false,
  color: true,
  checkLeaks: true,
  fullTrace: true,
  asyncOnly: false,
  spec: require('./specs').base,
  timeout: 200 * 1000, //API takes a little long to start up
  reporter: 'spec',
  require: [ 'tests/integration/hooks.js' ],
  captureFile: 'tests/results/results.txt',
  exit: true,
};
