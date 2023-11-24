module.exports = {
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
    subdir: '.',
    fixWebpackSourcePaths: true,
    skipFilesWithNoCoverage: true,
  }
};
