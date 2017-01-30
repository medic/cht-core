angular.module('inboxControllers').controller('AnalyticsTargetsCtrl',
  function (
    $log,
    $scope,
    $timeout,
    RulesEngine,
    TargetGenerator
  ) {

    'use strict';
    'ngInject';

    $scope.targets = [];
    $scope.targetsDisabled = !RulesEngine.enabled;

    TargetGenerator(function(err, targets) {
      if (err) {
        return $log.error('Error fetching targets', err);
      }
      targets.forEach(function(target) {
        if (!target.count) {
          target.count = 0;
        }
        // Width of the progress bar to display.
        target.displayProgress = Math.round(target.count * 100 / target.goal);
      });
      // timeout to force digest
      $timeout(function() {
        $scope.targets = targets;
      });
    });

  }
);
