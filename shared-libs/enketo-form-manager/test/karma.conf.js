// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html
const path = require('path');
module.exports = function(config) {
  config.set({
    basePath: '../',
    frameworks: ['mocha'],
    plugins: [
      require('karma-mocha'),
      require('karma-chrome-launcher'),
      require('karma-mocha-reporter'),
      require('karma-coverage'),
      require('karma-webpack'),
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
    files: [
      'node_modules/jquery/dist/jquery.js',
      'test/enketo-form-manager.spec.js',
    ],
    preprocessors: {
      'test/enketo-form-manager.spec.js': ['webpack'],
    },
    webpack: {
      mode: 'development',
      devtool: false,
      watch: true,
      module: {
        rules: [
          {
            test: /\.xml$/i,
            use: 'raw-loader',
          },
        ],
      },
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
