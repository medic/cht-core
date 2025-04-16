module.exports = {
  frameworks: ['mocha', '@angular-devkit/build-angular'],
  plugins: [
    require('karma-mocha'),
    require('karma-chrome-launcher'),
    require('karma-mocha-reporter'),
    require('@angular-devkit/build-angular/plugins/karma'),
    require('karma-coverage'),
    {
      'middleware:filterIconErrors': ['factory', function() {
        return function(request, response, next) {
          // Patch console.error to filter icon-related error messages
          const originalError = console.error;
          console.error = function() {
            // Check if arguments contain any icon-related message
            if (arguments.length > 0) {
              const firstArg = arguments[0];
              if (typeof firstArg === 'string' && 
                 (firstArg.includes('icon') || 
                  firstArg.includes('Icon') || 
                  firstArg.includes('Unable to find') ||
                  (firstArg === 'ERROR' && arguments[1] && 
                   arguments[1].toString && 
                   arguments[1].toString().includes('icon')))) {
                // Skip this error
                return;
              }
            }
            // Pass through all other errors
            return originalError.apply(console, arguments);
          };
          next();
        };
      }]
    }
  ],
  client: {
    captureConsole: true
  },
  middleware: ['filterIconErrors'],
  reporters: ['mocha', 'coverage'],
  mochaReporter: {
    output: 'full',
    showDiff: true,
    suppressErrorSummary: true
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
