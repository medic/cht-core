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
    ['$scope', '$rootScope', '$state', '$stateParams',
    function ($scope, $rootScope, $state, $stateParams) {
      $scope.setSelectedModule();
      $scope.clearSelected();
      $scope.filterModel.type = 'analytics';
      $scope.loading = true;
      $scope.fetchAnalyticsModules().then(function(modules) {
        $scope.loading = false;
        var module = findSelectedModule($stateParams.module, modules);
        $scope.setSelectedModule(module);
        if (module) {
          module.render($scope);
        }
        if ($stateParams.tour) {
          $rootScope.$broadcast('TourStart', $stateParams.tour);
        }
      });

      $scope.loadPatient = function(id) {
        $state.go('reports.detail', { query: 'patient_id:' + id });
      };

      $scope.loadContact = function(id) {
        $state.go('reports.detail', { query: 'contact:' + id });
      };
    }
  ]);

}());