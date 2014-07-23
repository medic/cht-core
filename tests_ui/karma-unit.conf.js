module.exports = function(config) {

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
      // 3rd Party Code
      'bower_components/jquery/dist/jquery.js',
      'bower_components/angular/angular.js',
      'bower_components/angular-route/angular-route.js',
      'bower_components/angular-resource/angular-resource.js',
      'bower_components/angular-sanitize/angular-sanitize.js',
      'bower_components/angular-translate/angular-translate.js',

      // app-specific Code
      'static/js/controllers.js',
      'static/js/services.js',
      'static/js/app.js',

      // test-Specific Code
      'node_modules/chai/chai.js',
      'bower_components/angular-mocks/angular-mocks.js',

      // templates
      'templates/partials/sender.html',

      // test files
      'tests_ui/unit/**/*.js'
    ]
  });

};