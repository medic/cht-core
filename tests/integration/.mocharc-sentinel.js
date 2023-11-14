require('../aliases');
const chaiExclude = require('chai-exclude');
const chaiAsPromised = require('chai-as-promised');
const chai = require('chai');
chai.use(chaiExclude);
chai.use(chaiAsPromised);
global.expect = chai.expect;

module.exports = {
  allowUncaught: false,
  color: true,
  checkLeaks: true,
  fullTrace: true,
  asyncOnly: false,
  spec: [
    'tests/integration/sentinel/**/*.spec.js'
  ],
  timeout: 200 * 1000, //API takes a little long to start up
  reporter: 'spec',
  require: [ 'tests/integration/hooks.js' ],
  captureFile: 'tests/results/results.txt',
  exit: true,
};
