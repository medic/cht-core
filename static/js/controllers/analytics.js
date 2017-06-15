var _ = require('underscore');

angular.module('inboxControllers').controller('AnalyticsCtrl',
  function (
    $scope,
    $state,
    $stateParams,
    $timeout,
    AnalyticsModules,
    Tour
  ) {
    'use strict';
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
    });

    if ($stateParams.tour) {
      Tour.start($stateParams.tour);
    }

    $scope.loadPatient = function(id) {
      $state.go('reports.detail', { query: 'patient_id:' + id });
    };

    $scope.loadContact = function(id) {
      $state.go('reports.detail', { query: 'contact:' + id });
    };
  }
);
