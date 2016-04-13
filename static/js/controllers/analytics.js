var _ = require('underscore');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('AnalyticsCtrl',
    ['$scope', '$rootScope', '$state', '$stateParams', 'AnalyticsModules', 'Auth',
    function ($scope, $rootScope, $state, $stateParams, AnalyticsModules, Auth) {
      $scope.analyticsModules = [];

      $scope.loading = true;

      $scope.setSelectedModule = function(module) {
        $scope.selected = module;
      };
      $scope.setSelectedModule();
      $scope.clearSelected();

      AnalyticsModules().then(function(modules) {
        $scope.loading = false;
        $scope.analyticsModules = modules;
        if (_.findWhere(modules, { id: 'anc' })) {
          Auth('can_view_analytics').then(function() {
            $scope.tours.push({
              order: 3,
              id: 'analytics',
              icon: 'fa-bar-chart-o',
              name: 'Analytics'
            });
          });
        }
        $scope.setSelectedModule(findSelectedModule(modules));
        if ($stateParams.tour) {
          $rootScope.$broadcast('TourStart', $stateParams.tour);
        }
        if (modules.length === 1) {
          $state.go(modules[0].state);
        }
      });

      var findSelectedModule = function(modules) {
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