const baseConfig = require('./.mocharc-base');

module.exports = {
  ...baseConfig,
  spec: [
    'tests/integration/!(cht-conf|sentinel)/**/*.spec.js', // run everything except the sentinel tests - those are tested in .mocharc-sentinel.js
    'tests/integration/cht-conf/**/*.spec.js', // Executing last to not side-effect sentinel tests.
  ],
};
