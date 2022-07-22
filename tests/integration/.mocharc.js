const chaiExclude = require('chai-exclude');
const chai = require('chai');
chai.use(chaiExclude);

module.exports = {
  allowUncaught: false,
  color: true,
  checkLeaks: true,
  fullTrace: true,
  asyncOnly: false,
  spec: [
    'tests/e2e/api/**/*.js',
    'tests/integration/**/*.js',
    'tests/e2e/sentinel/**/*.js',
    'tests/e2e/transitions/**/*.js',
    'tests/cht-conf/**/*.js'
  ],
  timeout: 200 * 1000, //API takes a little long to start up
  reporter: 'spec',
  require: [ 'tests/integration/hooks.js' ],
  captureFile: 'tests/results/results.txt',
  exit: true,
};
