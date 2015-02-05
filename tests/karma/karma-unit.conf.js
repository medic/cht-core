module.exports = function(config) {

  'use strict';

  config.set({
    basePath: '../../',
    frameworks: ['mocha'],
    reporters: ['progress'],
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

      // application code
      'static/dist/inbox.js',

      // test-specific code
      'node_modules/chai/chai.js',
      'bower_components/angular-mocks/angular-mocks.js',
      'bower_components/moment/moment.js',

      // templates
      'templates/partials/sender.html',

      // test files
      'tests/karma/unit/**/*.js'
    ]
  });

};
