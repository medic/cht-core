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
        $scope.targets = targets;
      });

    }
  ]);

}());