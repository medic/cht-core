(function () {

  'use strict';

  angular.module('inboxApp', [
    'ngRoute',
    'inboxControllers',
    'inboxServices'
  ])
  .config(['$routeProvider',
    function($routeProvider) {
      $routeProvider
        .when('/messages/:doc?', {
          templateUrl: '/partials/messages.html',
          controller: 'MessageCtrl'
        })
        .when('/forms/:doc?', {
          templateUrl: '/partials/messages.html',
          controller: 'FormCtrl'
        })
        .when('/reports', {
          templateUrl: '/partials/reports.html',
          controller: 'ReportCtrl'
        })
        .otherwise({
          redirectTo: '/messages'
        });
    }
  ]);
  
}());