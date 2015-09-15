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
    ['$scope', '$rootScope', '$state', '$stateParams', 'Settings', 'AnalyticsModules',
    function ($scope, $rootScope, $state, $stateParams, Settings, AnalyticsModules) {
      $scope.setSelectedModule();
      $scope.clearSelected();
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

      if ($stateParams.tour) {
        $rootScope.$broadcast('TourStart', $stateParams.tour);
      }

      $scope.loadPatient = function(id) {
        $state.go('reports.detail', { query: 'patient_id:' + id });
      };

      $scope.loadContact = function(id) {
        $state.go('reports.detail', { query: 'contact:' + id });
      };
    }
  ]);

}());