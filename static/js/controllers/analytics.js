var _ = require('underscore');

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
    ['$scope', '$route', 'Settings', 'AnalyticsModules',
    function ($scope, $route, Settings, AnalyticsModules) {
      $scope.setSelectedModule();
      $scope.filterModel.type = 'analytics';
      $scope.loading = true;
      Settings(function(err, res) {
        if (err) {
          return console.log('Error fetching settings', err);
        }
        $scope.setAnalyticsModules(AnalyticsModules(res));
        $scope.setSelectedModule(findSelectedModule(
          $route.current.params.module, $scope.analyticsModules
        ));
        $scope.loading = false;
        if ($scope.filterModel.module) {
          $scope.filterModel.module.render($scope);
        }
      });
    }
  ]);

}());