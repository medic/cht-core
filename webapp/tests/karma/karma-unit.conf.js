module.exports = function(config) {

  'use strict';

  config.set({
    basePath: '../../',
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
      'src/templates/**/*.html': ['ng-html2js']
    },
    ngHtml2JsPreprocessor: {
      moduleName: 'templates'
    },
    files: [
      // used to query html
      'node_modules/jquery/dist/jquery.js',

      '../node_modules/q/q.js',

      // application code
      '../build/ddocs/medic/_attachments/js/inbox.js',
      '../build/ddocs/medic/_attachments/js/templates.js',
      'src/templates/directives/sender.html',

      // test-specific code
      '../node_modules/chai/chai.js',
      '../node_modules/chai-shallow-deep-equal/chai-shallow-deep-equal.js',
      '../node_modules/sinon/pkg/sinon.js',
      '../node_modules/angular-mocks/angular-mocks.js',
      'node_modules/lodash/lodash.js',
      'node_modules/moment/moment.js',
      'node_modules/redux/dist/redux.js',
      'node_modules/ng-redux/umd/ng-redux.js',
      'node_modules/redux-thunk/dist/redux-thunk.js',
      'tests/karma/utils.js',

      // test files
      'tests/karma/unit/**/*.js'
    ]
  });
};
