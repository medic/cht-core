angular.module('controllers').controller('MessageQueueScheduledCtrl',
  function(
    $log,
    $scope,
    MessageQueue
  ) {

    'use strict';
    'ngInject';

    $scope.start = {
      next: false,
      current: false,
      prev: false
    };
    $scope.pageSize = 50;

    $scope.nextPage = function() {
      MessageQueue
        .getScheduled($scope.start.next, $scope.pageSize)
        .then(function(result) {
          $scope.messages = result.rows;
          $scope.start = {
            prev: $scope.start.current,
            current: $scope.start.next,
            next: result.next
          };
        });
    };

    $scope.nextPage();


  }
);
