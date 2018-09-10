var moment = require('moment');

angular.module('controllers').controller('MessageQueueCtrl',
  function(
    $log,
    $scope,
    $state,
    MessageQueue,
    Settings
  ) {

    'use strict';
    'ngInject';

    $scope.pagination = {
      page: 0,
      perPage: 10,
      pages: 0
    };
    var delayInterval = 5 * 60 * 1000; // 5 minutes
    var tab = $state.current.data.tab;
    $scope.displayLastUpdated = $state.current.data.displayLastUpdated;

    var conditionalStyling = function(messages) {
      if (tab === 'due') {
        var transitionalStates = [ 'pending', 'forwarded-to-gateway', 'forwarded-by-gateway', 'received', 'send' ],
            now                = moment();
        messages.forEach(function (message) {
          if (transitionalStates.indexOf(message.state) !== -1) {
            message.delayed = now.diff(message.stateHistory.timestamp) > delayInterval;
          }
        });
      }

      return messages;
    };

    Settings().then(function(settings) {
      $scope.dateFormat = settings.reported_date_format;
    });

    var getSkip = function() {
      return ($scope.pagination.page - 1) * $scope.pagination.perPage;
    };

    $scope.query = function() {
      $scope.loading = true;
      return MessageQueue(tab, getSkip(), $scope.pagination.limit).then(function(result) {
        if (!result.rows.length) {
          // we've navigated out of scope, return to page 1
          return $scope.goToPage(1);
        }
        $scope.messages = conditionalStyling(result.rows);

        $scope.pagination.pages = Math.ceil(result.total / $scope.pagination.perPage);
        $scope.pagination.total = result.total;
        $scope.loading = false;
      });
    };

    $scope.goToPage = function(page) {
      if (page <= 0 || ($scope.pagination.pages && page > $scope.pagination.pages)) {
        return;
      }

      $scope.pagination.page = page;
      return $scope.query();
    };

    $scope.goToPage(1);
  }
);
