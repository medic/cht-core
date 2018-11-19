module.exports = function(config) {
  'use strict';

  config.set({
    basePath: '../',
    frameworks: ['mocha'],
    reporters: ['spec'],
    autoWatch: true,
    singleRun: false,
    colors: true,
    browserNoActivityTimeout: 60000,
    customLaunchers: {
      Chrome_Headless: {
        base: 'Chrome',
        flags: ['--headless', '--disable-gpu', '--remote-debugging-port=9222']
      }
    },
    preprocessors: {
      'src/**/*.html': ['ng-html2js']
    },
    ngHtml2JsPreprocessor: {
      moduleName: 'templates'
    },
    files: [
      // used to query html
      'node_modules/jquery/dist/jquery.js',
      'node_modules/underscore/underscore.js',

      // borrowed from webapp
      '../webapp/node_modules/q/q.js',

      // application code
      '../build/ddocs/medic-admin/_attachments/js/main.js',
      '../build/ddocs/medic-admin/_attachments/js/templates.js',

      // test-specific code
      '../node_modules/chai/chai.js',
      '../node_modules/sinon/pkg/sinon.js',
      '../node_modules/angular-mocks/angular-mocks.js',
      'tests/utils.js',

      // test files
      'tests/unit/**/*.js',

      // templates
      'src/**/*.html'
    ]
  });
  
};
