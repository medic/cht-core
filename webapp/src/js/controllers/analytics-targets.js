angular.module('inboxControllers').controller('AnalyticsTargetsCtrl',
  function (
    $log,
    $timeout,
    RulesEngine,
    TargetGenerator
  ) {

    'use strict';
    'ngInject';

    const ctrl = this;

    ctrl.targets = [];
    ctrl.targetsDisabled = !RulesEngine.enabled;
    ctrl.loading = true;

    TargetGenerator(function(err, targets) {
      if (err) {
        return $log.error('Error fetching targets', err);
      }
      // timeout to force digest
      $timeout(function() {
        ctrl.targets = targets;
        ctrl.loading = false;
      });
    });

  }
);
