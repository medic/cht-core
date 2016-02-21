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
      'templates/partials/*.html': ['ng-html2js']
    },
    ngHtml2JsPreprocessor: {
      moduleName: 'templates'
    },
    files: [
      // used to query html
      'bower_components/jquery/dist/jquery.js',

      'tests/karma/q.js',

      // application code
      'static/dist/dependencies.js',
      'static/dist/inbox.js',
      'static/dist/templates.js',
      'templates/partials/sender.html',

      // test-specific code
      'node_modules/chai/chai.js',
      'node_modules/sinon/pkg/sinon.js',
      'bower_components/angular-mocks/angular-mocks.js',
      'bower_components/moment/moment.js',
      'tests/karma/utils.js',

      // test files
      'tests/karma/unit/**/*.js'
    ]
  });

};
