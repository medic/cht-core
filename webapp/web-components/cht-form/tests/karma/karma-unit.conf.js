// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html
const path = require('path');
const baseConfig = require('../../../../tests/karma/karma-unit.base.conf');

module.exports = function (config) {
  config.set({
    ...baseConfig,
    basePath: '../../',
    logLevel: config.LOG_INFO,
    coverageReporter: {
      ...baseConfig.coverageReporter,
      dir: path.join(__dirname, 'coverage'),
      check: {
        global: {
          statements: 98,
          lines: 98,
          branches: 100,
          functions: 93,
        },
      },
    }
  });
};
