module.exports = function(config) {

  'use strict';

  config.set({
    basePath: '../',
    frameworks: ['mocha'],
    reporters: ['progress'],
    autoWatch: true,
    singleRun: false,
    colors: true,

    preprocessors: {
      'templates/partials/*.html': ['ng-html2js']
    },

    ngHtml2JsPreprocessor: {
      stripPrefix: 'templates',
      moduleName: 'templates'
    },
    
    files: [
      // 3rd party code
      'bower_components/jquery/dist/jquery.js',
      'bower_components/angular/angular.js',
      'bower_components/angular-animate/angular-animate.js',
      'bower_components/angular-route/angular-route.js',
      'bower_components/angular-resource/angular-resource.js',
      'bower_components/angular-sanitize/angular-sanitize.js',
      'bower_components/angular-translate/angular-translate.js',
      'bower_components/moment/moment.js',

      // app-specific code
      'static/js/filters.js',
      'static/js/controllers.js',
      'static/js/services.js',
      'static/js/app.js',

      // test-specific code
      'node_modules/chai/chai.js',
      'bower_components/angular-mocks/angular-mocks.js',

      // templates
      'templates/partials/sender.html',

      // test files
      'tests_ui/unit/**/*.js'
    ]
  });

};