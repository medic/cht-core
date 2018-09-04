angular.module('controllers').controller('MessageQueueDueCtrl',
  function(
    $log,
    $scope,
    MessageQueue,
    Settings
  ) {

    'use strict';
    'ngInject';

    var pagination = {
      skip: 0,
      limit: 10
    };
    $scope.displayLastUpdated = true;
    $scope.pagination = {
      next: false,
      prev: false
    };

    Settings().then(function(settings) {
      $scope.dateFormat = settings.reported_date_format;
    });

    $scope.nextPage = function() {
      pagination.skip += $scope.messages ? $scope.messages.length : 0;
      MessageQueue
        .getDue(pagination.skip, pagination.limit)
        .then(function(result) {
          $scope.messages = result.rows;
          $scope.pagination.next = result.next;
          $scope.pagination.prev = pagination.skip > 0;

        });
    };

    $scope.prevPage = function() {
      pagination.skip = Math.max(0, pagination.skip - pagination.limit);
      MessageQueue
        .getDue(pagination.skip, pagination.limit)
        .then(function(result) {
          $scope.messages = result.rows;
          $scope.pagination.next = result.next;
          $scope.pagination.prev = pagination.skip > 0;
        });
    };

    $scope.nextPage();


  }
);
