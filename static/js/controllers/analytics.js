var _ = require('underscore');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('AnalyticsCtrl',
    ['$scope', '$rootScope', '$state', '$stateParams',
    function ($scope, $rootScope, $state, $stateParams) {
      $scope.setSelectedModule();
      $scope.clearSelected();
      $scope.filterModel.type = 'analytics';
      $scope.loading = true;
      $scope.fetchAnalyticsModules().then(function(modules) {
        $scope.loading = false;
        $scope.setSelectedModule(findSelectedModule(modules));
        if ($stateParams.tour) {
          $rootScope.$broadcast('TourStart', $stateParams.tour);
        }
        if (modules.length === 1) {
          if (!$rootScope.isAnalyticsStateForceReload) {
            setAnalyticsStateToForceReload();
            $rootScope.isAnalyticsStateForceReload = true;
          }
          $state.go(modules[0].state);
        }
      });

      // Force-reloading will run the controller, to allow jumping to child-state.
      // (when transitioning from child state to parent state, the parent controller is not reloaded.)
      var setAnalyticsStateToForceReload = function() {
        $rootScope.$on('$stateChangeStart', function(event, toState, toParams, fromState, fromParams) {
          if (toState.name === 'analytics' && fromState.name.startsWith('analytics.')) {
            event.preventDefault();
            $state.reload('analytics');
          }
        });
      };

      var findSelectedModule = function( modules) {
        if (!modules.length) {
          return undefined;
        }
        var module = _.findWhere(modules, { state: $state.current.name });
        if (!module) {
          module = modules[0];
        }
        return module;
      };

      $scope.loadPatient = function(id) {
        $state.go('reports.detail', { query: 'patient_id:' + id });
      };

      $scope.loadContact = function(id) {
        $state.go('reports.detail', { query: 'contact:' + id });
      };
    }
  ]);

}());