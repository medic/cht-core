var _ = require('underscore');

angular.module('inboxControllers').controller('AnalyticsCtrl',
  function (
    $ngRedux,
    $scope,
    $state,
    $stateParams,
    $timeout,
    AnalyticsModules,
    GlobalActions,
    Tour
  ) {
    'use strict';
    'ngInject';

    var ctrl = this;
    var mapDispatchToTarget = function(dispatch) {
      var globalActions = GlobalActions(dispatch);
      return {
        setSelected: globalActions.setSelected
      };
    };
    var unsubscribe = $ngRedux.connect(null, mapDispatchToTarget)(ctrl);

    $scope.analyticsModules = [];

    ctrl.loading = true;

    ctrl.setSelected(null);
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
        ctrl.setSelected(_.findWhere(modules, {
          state: $state.current.name
        }));
      }

      ctrl.loading = false;
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

    $scope.$on('$destroy', unsubscribe);
  }
);
