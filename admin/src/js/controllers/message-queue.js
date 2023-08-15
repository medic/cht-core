const moment = require('moment');

angular.module('controllers').controller('MessageQueueCtrl',
  function(
    $log,
    $q,
    $scope,
    $state,
    Location,
    MessageQueue,
    Settings
  ) {

    'use strict';
    'ngInject';

    const delayInterval = 5 * 60 * 1000; // 5 minutes
    const tab = $state.current.data.tab;
    const descending = $state.current.data.descending;
    const transitionalStates = [ 'pending', 'forwarded-to-gateway', 'forwarded-by-gateway', 'received', 'sent' ];

    const normalizePage = function(page) {
      page = parseInt(page);
      if (isNaN(page) || page <= 0) {
        return 1;
      }
      return page;
    };

    $scope.pagination = {
      page: normalizePage($state.params.page),
      perPage: 25,
      pages: 0
    };
    $scope.displayLastUpdated = tab !== 'scheduled';
    $scope.loading = true;
    $scope.basePath = Location.path;

    const formatMessages = function(messages) {
      if (tab === 'due') {
        const now = moment();
        messages.forEach(function (message) {
          if (transitionalStates.indexOf(message.state) !== -1 && message.stateHistory) {
            message.delayed = now.diff(message.stateHistory.timestamp) > delayInterval;
          }
        });
      }

      return messages;
    };

    const query = function() {
      $scope.loading = true;
      $scope.messages = [];
      // change the state without triggering controller reinitialization
      $state.go('.', { page: $scope.pagination.page }, { notify: false });

      const skip = ($scope.pagination.page - 1) * $scope.pagination.perPage;
      return MessageQueue
        .query(tab, skip, $scope.pagination.perPage, descending)
        .then(function(result) {
          if (!result.messages.length && $scope.pagination.page > 1) {
            // we've navigated out of scope, return to page 1
            return $scope.loadPage(1);
          }

          $scope.messages = formatMessages(result.messages);
          $scope.pagination.pages = Math.ceil(result.total / $scope.pagination.perPage);
          $scope.pagination.total = result.total;

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
      page = normalizePage(page);
      if ($scope.pagination.pages && $scope.pagination.pages < page) {
        return;
      }

      $scope.pagination.page = page;
      return query();
    };

    const setupPromise = $q.all([
      Settings(),
      MessageQueue.loadTranslations()
    ])
      .then(function(results) {
        $scope.dateFormat = results[0] && results[0].reported_date_format;
        return query();
      })
      .catch(function(err) {
        $log.error('Error fetching settings', err);
      });

    this.getSetupPromiseForTesting = () => setupPromise;
  });
