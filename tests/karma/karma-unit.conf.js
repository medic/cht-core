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
      // needed so mockPromise can use ES6 promises
      'node_modules/babel-core/browser-polyfill.js',

      // used to query html
      'bower_components/jquery/dist/jquery.js',

      // shim to get pouchdb to work with phantomjs
      'tests/karma/pouchdb-shim.js',

      // application code
      'static/dist/dependencies.js',
      'static/dist/inbox.js',
      'static/dist/templates.js',

      // test-specific code
      'node_modules/chai/chai.js',
      'node_modules/sinon/pkg/sinon.js',
      'bower_components/angular-mocks/angular-mocks.js',
      'bower_components/moment/moment.js',
      'tests/karma/utils.js',

      // templates
      'templates/partials/sender.html',

      // test files
      'tests/karma/unit/**/*.js'
    ]
  });

};
