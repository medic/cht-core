var moment = require('moment');

angular.module('controllers').controller('MessageQueueDueCtrl',
  function(
    $log,
    $scope,
    MessageQueue,
    Settings
  ) {

    'use strict';
    'ngInject';

    var delayInterval = 5 * 60 * 1000; // 5 minutes

    $scope.displayLastUpdated = true;
    $scope.pagination = {
      page: 0,
      perPage: 10,
      pages: 0
    };

    Settings().then(function(settings) {
      $scope.dateFormat = settings.reported_date_format;
    });

    var conditionalStyling = function(messages) {
      var transitionalStates = ['pending', 'forwarded-to-gateway', 'forwarded-by-gateway', 'received', 'send'],
          now = moment();
      messages.forEach(function(message) {
        if (transitionalStates.indexOf(message.state) !== -1) {
          message.delayed = now.diff(message.state_history.timestamp) > delayInterval;
        }
      });

      return messages;
    };

    var getSkip = function() {
      return ($scope.pagination.page - 1) * $scope.pagination.perPage;
    };

    var getItems = function() {
      return MessageQueue('due', getSkip(), $scope.pagination.limit).then(function(result) {
        $scope.messages = conditionalStyling(result.rows);

        $scope.pagination.pages = Math.ceil(result.total / $scope.pagination.perPage);
        $scope.pagination.total = result.total;
      });
    };

    $scope.goToPage = function(page) {
      $scope.pagination.page = page;
      return getItems();
    };

    $scope.goToPage(1);
  }
);
