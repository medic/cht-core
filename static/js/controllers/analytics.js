var _ = require('underscore');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('AnalyticsCtrl',
    function (
      $rootScope,
      $scope,
      $state,
      $stateParams,
      $timeout,
      AnalyticsModules,
      Auth
    ) {
      'ngInject';

      $scope.analyticsModules = [];

      $scope.loading = true;

      $scope.setSelectedModule = function(module) {
        $scope.selected = module;
      };
      $scope.setSelectedModule();
      $scope.clearSelected();

      AnalyticsModules().then(function(modules) {
        if ($state.is('analytics')) {
          if (modules.length === 1) {
            // timeout so this transition finishes before starting the next one
            $timeout(function() {
              $state.go(modules[0].state, { }, { location: 'replace' });
            });
            return;
          }
        } else {
          $scope.setSelectedModule(_.findWhere(modules, {
            state: $state.current.name
          }));
        }

        $scope.loading = false;
        $scope.analyticsModules = modules;

        // show tour
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
  );

}());