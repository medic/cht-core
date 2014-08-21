var reporting = require('kujua-reporting/shows');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('AnalyticsCtrl', 
    ['$scope',
    function ($scope) {
      $scope.filterModel.type = 'analytics';
      reporting.render_page();
    }
  ]);

}());