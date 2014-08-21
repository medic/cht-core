require('./services/index');
require('./controllers/inbox');
require('./filters/index');
require('../dist/reporting-views');

(function () {

  'use strict';

  var app = angular.module('inboxApp', [
    'ngRoute',
    'ngAnimate',
    'inboxFilters',
    'inboxControllers',
    'inboxServices',
    'pascalprecht.translate'
  ]);

  app.config(['$routeProvider', '$translateProvider',
    function($routeProvider, $translateProvider) {
     
      $routeProvider
        .when('/messages/:doc?', {
          templateUrl: '/partials/messages.html',
          controller: 'MessagesCtrl'
        })
        .when('/reports/:doc?', {
          templateUrl: '/partials/reports.html',
          controller: 'ReportsCtrl'
        })
        .when('/analytics', {
          templateUrl: '/partials/analytics.html',
          controller: 'AnalyticsCtrl'
        })
        .otherwise({
          redirectTo: '/messages'
        });

      $translateProvider.useLoader('SettingsLoader', {});
      
    }
  ]);

  app.factory('SettingsLoader', ['$q', 'Settings', function ($q, Settings) {
    return function (options) {

      options.key = options.key || 'en';

      var deferred = $q.defer();

      Settings.query(function(res) {
        if (res.settings && res.settings.translations) {
          var data = {};
          res.settings.translations.forEach(function(translation) {
            var key = translation.key;
            var value = translation.default || translation.key;
            translation.translations.forEach(function(val) {
              if (val.locale === options.key) {
                value = val.content;
              }
            });
            data[key] = value;
          });
          deferred.resolve(data);
        } else {
          deferred.reject(options.key);
        }
      });
      
      return deferred.promise;
    };
  }]);
  
}());

