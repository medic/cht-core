const baseConfig = require('./.mocharc-base');

module.exports = {
  ...baseConfig,
  spec: require('./specs').all,
  grep: '@docker', // exclude all tests that should only run in docker
  invert: true,
  timeout: 20000 * 1000, // API takes a little long to start up
  require: [ 'tests/integration/hooks-k3d.js' ],
};
