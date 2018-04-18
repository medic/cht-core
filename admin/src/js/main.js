window.PouchDB = require('pouchdb-browser');
window.$ = window.jQuery = require('jquery');
require('../../node_modules/select2/dist/js/select2.full');

require('angular');
require('angular-pouchdb');
require('angular-route');
require('angular-sanitize');
require('angular-translate');
require('angular-translate-interpolation-messageformat');
require('angular-ui-router');

angular.module('controllers', []);
angular.module('services', []);

require('./controllers/main');
require('./controllers/settings-advanced');
require('./controllers/settings-basic');

require('./services/db');
require('./services/languages');
require('./services/settings');
require('./services/translation-loader');
require('./services/update-settings');

var app = angular.module('adminApp', [
  'controllers',
  'ngRoute',
  'pascalprecht.translate',
  'pouchdb',
  'services',
  'ui.router',
]);

app.config(function($stateProvider, $translateProvider) {
  'ngInject';

  $translateProvider.useLoader('TranslationLoader', {});
  $translateProvider.useSanitizeValueStrategy('escape');
  $translateProvider.addInterpolation('$translateMessageFormatInterpolation');

  $stateProvider
    .state('settings', {
      url: '/settings',
      templateUrl: 'templates/settings.html'
    })
    .state('settings.basic', {
      url: '/basic',
      views: {
        tab: {
          controller: 'SettingsBasicCtrl',
          templateUrl: 'templates/settings_basic.html'
        }
      }
    })
    .state('settings.advanced', {
      url: '/advanced',
      views: {
        tab: {
          controller: 'SettingsAdvancedCtrl',
          templateUrl: 'templates/settings_advanced.html'
        }
      }
    });
});

angular.element(document).ready(function() {
  angular.bootstrap(document, [ 'adminApp' ], {
    strictDi: true
  });
});
