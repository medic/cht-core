require('../aliases');
const base = require('../../mocharc');

module.exports = {
  ...base,
  spec: require('./specs').base,
  timeout: 200 * 1000, //API takes a little long to start up
  require: [ 'tests/integration/hooks.js' ],
  captureFile: 'tests/results/results.txt',
};
