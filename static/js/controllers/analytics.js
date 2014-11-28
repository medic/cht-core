var _ = require('underscore'),
    tour = require('../modules/tour');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  var findSelectedModule = function(id, modules) {
    if (!modules.length) {
      return undefined;
    }
    if (!id) {
      return modules[0];
    }
    return _.findWhere(modules, { id: id });
  };

  inboxControllers.controller('AnalyticsCtrl',
    ['$scope', '$stateParams', '$location', 'translateFilter', 'Settings', 'AnalyticsModules',
    function ($scope, $stateParams, $location, translateFilter, Settings, AnalyticsModules) {
      $scope.setSelectedModule();
      $scope.filterModel.type = 'analytics';
      $scope.loading = true;
      Settings(function(err, res) {
        if (err) {
          return console.log('Error fetching settings', err);
        }
        $scope.setAnalyticsModules(AnalyticsModules(res));
        $scope.setSelectedModule(findSelectedModule(
          $stateParams.module, $scope.analyticsModules
        ));
        $scope.loading = false;
        if ($scope.filterModel.module) {
          $scope.filterModel.module.render($scope);
        }
      });

      tour.start($stateParams.tour, translateFilter);
      $location.url($location.path());
    }
  ]);

}());