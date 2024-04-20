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
    'tests/integration/!(cht-conf)/**/*.spec.js',
  ],
  grep: '@docker', // exclude all tests that should only run in docker
  invert: true,
  timeout: 20000 * 1000, //API takes a little long to start up
  reporter: 'spec',
  require: [ 'tests/integration/hooks-k3d.js' ],
  captureFile: 'tests/results/results.txt',
  exit: true,
};
