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
    $scope.loading = true;

    TargetGenerator(function(err, targets) {
      if (err) {
        return $log.error('Error fetching targets', err);
      }
      // timeout to force digest
      $timeout(function() {
        $scope.targets = targets;
        $scope.loading = false;
      });
    });

  }
);
