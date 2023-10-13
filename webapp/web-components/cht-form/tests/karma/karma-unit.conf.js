// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html
const path = require('path');

module.exports = function (config) {
  config.set({
    basePath: '../../../../',
    frameworks: ['mocha', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-mocha'),
      require('karma-chrome-launcher'),
      require('karma-mocha-reporter'),
      require('@angular-devkit/build-angular/plugins/karma'),
      require('karma-coverage'),
    ],
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

  // allow to require xml files as strings
  config.buildWebpack.webpackConfig.module.rules.push({
    test: /enketo-xml\/.*\.xml$/i,
    use: 'raw-loader',
  });

  config.buildWebpack.webpackConfig.resolve.fallback = {
    path: false,
    fs: false,
  };
};
