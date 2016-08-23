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
    preprocessors: {
      'templates/**/*.html': ['ng-html2js']
    },
    ngHtml2JsPreprocessor: {
      moduleName: 'templates'
    },
    files: [
      // used to query html
      'node_modules/jquery/dist/jquery.js',
      'node_modules/underscore/underscore.js',

      'tests/karma/q.js',

      // application code
      'static/dist/inbox.js',
      'static/dist/templates.js',
      'templates/directives/sender.html',

      // test-specific code
      'node_modules/chai/chai.js',
      'node_modules/sinon/pkg/sinon.js',
      'node_modules/angular-mocks/angular-mocks.js',
      'node_modules/moment/moment.js',
      'tests/karma/utils.js',

      // test files
      'tests/karma/unit/**/*.js'
    ]
  });

};
