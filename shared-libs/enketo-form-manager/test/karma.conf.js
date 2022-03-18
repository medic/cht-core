/* eslint-env node */
const path = require("path");
module.exports = function(config) {
  config.set({
    basePath: '../',
    frameworks: ['mocha'],
    client: {
      captureConsole: true,
    },
    reporters: ['mocha', 'coverage'],
    mochaReporter: {
      output: 'full',
      showDiff: true,
    },
    logLevel: config.LOG_INFO,
    port: 9876,
    colors: true,
    autoWatch: true,
    singleRun: false,
    restartOnFileChange: false,
    browsers: ['ChromeHeadless'],
    customLaunchers: {
      ChromeHeadlessCI: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox'],
      }
    },
    browserConsoleLogOptions: {
      level: 'log',
      format: '%b %T: %m',
      terminal: true,
    },
    files: [
      { pattern: 'test/enketo-form-manager.spec.js', watched: false },
    ],
    preprocessors: {
      'test/enketo-form-manager.spec.js': ['webpack'],
    },
    webpack: {
      mode: 'development',
      devtool: false,
    },
    coverageReporter: {
      reporters: [
        { type: 'html' },
        { type: 'lcovonly', file: 'lcov.info' },
        { type: 'text-summary' },
      ],
      dir: path.join(__dirname, 'coverage'),
      subdir: '.',
      fixWebpackSourcePaths: true,
      skipFilesWithNoCoverage: true,
    },
  });
};
