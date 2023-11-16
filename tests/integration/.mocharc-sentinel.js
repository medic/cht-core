const baseConfig = require('./.mocharc-base');

module.exports = {
  ...baseConfig,
  spec: [ 'tests/integration/sentinel/**/*.spec.js' ],
};
