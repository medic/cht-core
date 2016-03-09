(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('AnalyticsTargetsCtrl',
    ['$scope', '$log', 'TargetGenerator',
    function ($scope, $log, TargetGenerator) {

      $scope.targets = [];

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

        $scope.targets = targets;
      });

    }
  ]);

}());