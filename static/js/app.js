
require('./services/index');
require('./controllers/inbox');
require('./filters/index');
require('../dist/reporting-views');

(function () {

  'use strict';

  var app = angular.module('inboxApp', [
    'ngRoute',
    'ngAnimate',
    'ui.router',
    'inboxFilters',
    'inboxControllers',
    'inboxServices',
    'pascalprecht.translate',
    'nvd3ChartDirectives'
  ]);

  app.config(['$stateProvider', '$urlRouterProvider', '$translateProvider',
    function($stateProvider, $urlRouterProvider, $translateProvider) {

      $stateProvider
        .state('messages', {
          url: '/messages?tour',
          controller: 'MessagesCtrl',
          templateUrl: '/partials/messages.html'
        })
        .state('messages.detail', {
          url: '/:id',
          views: {
            content: {
              controller: 'MessagesContentCtrl',
              templateUrl: '/partials/messages_content.html'
            }
          }
        })
        .state('reports', {
          url: '/reports?tour&query',
          controller: 'ReportsCtrl',
          templateUrl: '/partials/reports.html'
        })
        .state('reports.detail', {
          url: '/:id',
          views: {
            content: {
              controller: 'ReportsContentCtrl',
              templateUrl: '/partials/reports_content.html'
            }
          }
        })
        .state('analytics', {
          url: '/analytics/:module?tour',
          controller: 'AnalyticsCtrl',
          templateUrl: '/partials/analytics.html'
        });

      $urlRouterProvider.when('', '/messages');
      $translateProvider.useLoader('SettingsLoader', {});

    }
  ]);

  app.factory('SettingsLoader', ['$q', 'Settings', function ($q, Settings) {
    return function (options) {

      var deferred = $q.defer();

      Settings(function(err, res) {
        if (err) {
          return deferred.reject(err);
        }

        options.key = options.key || res.locale || 'en';

        var data = {};
        if (res.translations) {
          res.translations.forEach(function(translation) {
            var key = translation.key;
            var value = translation.default || key;
            translation.translations.forEach(function(val) {
              if (val.locale === options.key) {
                value = val.content;
              }
            });
            data[key] = value;
          });
        }
        deferred.resolve(data);
      });
      
      return deferred.promise;
    };
  }]);
  
}());

