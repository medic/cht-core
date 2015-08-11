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
    ['$scope', '$route', '$location', '$log', 'Settings', 'AnalyticsModules',
    function ($scope, $route, $location, $log, Settings, AnalyticsModules) {

      $log.debug('AnalyticsCtrl');
      $log.debug('$route', $route.current.params);
      $scope.setSelectedModule();
      $scope.filterModel.type = 'analytics';
      $scope.loading = true;
      Settings(function(err, res) {
        if (err) {
          return $log.error('Error fetching settings: ', err);
        }
        $scope.setAnalyticsModules(AnalyticsModules(res));
        $scope.setSelectedModule(findSelectedModule(
          $route.current.params.module, $scope.analyticsModules
        ));
        if ($route.current.params.form) {
          $scope.filterModel.selectedForm = $route.current.params.form;
        }
        if ($route.current.params.facility) {
          $scope.filterModel.selectedFacility = $scope.facilitiesLookup[$route.current.params.facility];
        }
        $scope.loading = false;
        if ($scope.filterModel.module) {
          $scope.filterModel.module.render($scope);
        }
      });
      tour.start($route.current.params.tour);
      $location.url($location.path());
    }
  ]);

}());
