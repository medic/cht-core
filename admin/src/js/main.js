require('angular');
require('angular-route');
require('angular-ui-router');

require('./controllers/main');

var app = angular.module('adminApp', [
  'ngRoute',
  'ui.router',
  'controllers'
]);

app.config(function($stateProvider) {
  'ngInject';
  $stateProvider
    .state('settings', {
      url: '/settings',
      views: {
        content: {
          templateUrl: 'src/templates/settings.html'
        }
      }
    })
    .state('settings.basic', {
      url: '/basic',
      views: {
        tab: {
          controller: 'SettingsBasicCtrl',
          templateUrl: 'src/templates/settings_basic.html'
        }
      }
    })
    .state('settings.advanced', {
      url: '/advanced',
      views: {
        tab: {
          controller: 'SettingsAdvancedCtrl',
          templateUrl: 'src/templates/settings_advanced.html'
        }
      }
    });
});

angular.element(document).ready(function() {
  angular.bootstrap(document, [ 'adminApp' ], {
    strictDi: true
  });
});
