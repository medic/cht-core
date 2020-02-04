const _ = require('lodash');

angular.module('inboxControllers').controller('AnalyticsCtrl',
  function (
    $ngRedux,
    $scope,
    $state,
    $stateParams,
    $timeout,
    AnalyticsActions,
    AnalyticsModules,
    GlobalActions,
    Tour
  ) {
    'use strict';
    'ngInject';

    const ctrl = this;
    const mapDispatchToTarget = function(dispatch) {
      const analyticsActions = AnalyticsActions(dispatch);
      const globalActions = GlobalActions(dispatch);
      return {
        unsetSelected: globalActions.unsetSelected,
        setSelectedAnalytics: analyticsActions.setSelectedAnalytics
      };
    };
    const unsubscribe = $ngRedux.connect(null, mapDispatchToTarget)(ctrl);

    ctrl.analyticsModules = [];

    ctrl.loading = true;

    ctrl.setSelectedAnalytics(null);
    ctrl.unsetSelected();

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
        ctrl.setSelectedAnalytics(_.find(modules, {
          state: $state.current.name
        }));
      }

      ctrl.loading = false;
      ctrl.analyticsModules = modules;
    });

    if ($stateParams.tour) {
      Tour.start($stateParams.tour);
    }

    $scope.$on('$destroy', unsubscribe);
  }
);
