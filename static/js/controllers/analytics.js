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
    ['$scope', '$route', 'AnalyticsModules',
    function ($scope, $route, AnalyticsModules) {
      $scope.setSelectedModule();
      $scope.filterModel.type = 'analytics';
      $scope.setAnalyticsModules(AnalyticsModules());
      $scope.setSelectedModule(findSelectedModule(
        $route.current.params.module, $scope.analyticsModules
      ));

      if ($scope.filterModel.module) {
        $scope.filterModel.module.render($scope);
      }
    }
  ]);

}());