var moment = require('moment');

angular.module('controllers').controller('MessageQueueCtrl',
  function(
    $log,
    $scope,
    $state,
    $translate,
    MessageQueue,
    Settings
  ) {

    'use strict';
    'ngInject';

    var delayInterval = 5 * 60 * 1000, // 5 minutes
        tab = $state.current.data.tab;

    var normalizePage = function(page) {
      page = parseInt(page);
      if (isNaN(page) || page <= 0) {
        return 1;
      }

      return page;
    };

    $scope.pagination = {
      page: normalizePage($state.params.page),
      perPage: 50,
      pages: 0
    };

    $scope.displayLastUpdated = tab === 'scheduled' ? false : true;

    var conditionalStyling = function(messages) {
      if (tab === 'due') {
        var transitionalStates = [ 'pending', 'forwarded-to-gateway', 'forwarded-by-gateway', 'received', 'send' ],
            now = moment();
        messages.forEach(function (message) {
          if (transitionalStates.indexOf(message.state) !== -1) {
            message.delayed = now.diff(message.stateHistory.timestamp) > delayInterval;
          }
        });
      }

      return messages;
    };

    var query = function() {
      $scope.loading = true;
      var skip = ($scope.pagination.page - 1) * $scope.pagination.perPage;

      return MessageQueue
        .query(tab, skip, $scope.pagination.perPage)
        .then(function(result) {
          if (!result.messages.length) {
            // we've navigated out of scope, return to page 1
            return $scope.loadPage(1);
          }

          $scope.messages = conditionalStyling(result.messages);
          $scope.pagination.pages = Math.ceil(result.total / $scope.pagination.perPage);
          $scope.pagination.total = result.total;

          $state.go('.', { page: $scope.pagination.page }, { notify: false });
          $scope.error = false;
        })
        .catch(function(err) {
          $log.error('Error fetching messages', err);
          $scope.error = true;
        })
        .then(function() {
          $scope.loading = false;
        });
    };

    $scope.loadPage = function(page) {
      $scope.pagination.page = normalizePage(page);
      return query();
    };

    Settings().then(function(settings) {
      $scope.dateFormat = settings.reported_date_format;
    });

    MessageQueue.loadTranslations().then(function() {
      query();
    });
  }
);
