angular.module('controllers').controller('MessageQueueScheduledCtrl',
  function(
    $log,
    $scope,
    MessageQueue,
    Settings
  ) {

    'use strict';
    'ngInject';

    $scope.displayLastUpdated = true;
    $scope.pagination = {
      page: 0,
      perPage: 10,
      pages: 0
    };

    Settings().then(function(settings) {
      $scope.dateFormat = settings.reported_date_format;
    });

    var getSkip = function() {
      return $scope.pagination.page * $scope.pagination.perPage;
    };

    $scope.nextPage = function() {
      $scope.pagination.page++;
      MessageQueue('scheduled', getSkip(), $scope.pagination.limit).then(function(result) {
        $scope.messages = result.rows;

        $scope.pagination = {
          pages: Math.ceil(result.total / $scope.pagination.perPage)
        };
      });
    };

    $scope.prevPage = function() {
      $scope.pagination.page++;
      MessageQueue('scheduled', getSkip(), $scope.pagination.perPage).then(function(result) {
        $scope.messages = result.rows;

        $scope.pagination = {
          pages: Math.ceil(result.total / $scope.pagination.perPage),
        };
      });
    };

    $scope.goToPage = function(page) {
      $scope.pagination.page = page;

    };

    $scope.nextPage();
  }
);
