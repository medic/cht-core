var _ = require('underscore');

angular
  .module('inboxControllers')
  .controller('MessagesCtrl', function(
    $log,
    $scope,
    $state,
    $stateParams,
    $timeout,
    Changes,
    Export,
    MessageContacts,
    MessageListUtils,
    Tour
  ) {
    'use strict';
    'ngInject';

    $scope.allLoaded = false;
    $scope.messages = [];
    $scope.selected = null;
    $scope.loading = true;

    var setMessages = function(options) {
      options = options || {};
      if (options.changes) {
        MessageListUtils.removeDeleted($scope.messages, options.messages);
        var selectedChanged = MessageListUtils.mergeUpdated(
          $scope.messages,
          options.messages,
          $scope.selected && $scope.selected.id
        );
        if (selectedChanged) {
          $scope.$broadcast('UpdateContactConversation', { silent: true });
        }
      } else {
        $scope.messages = options.messages || [];
      }
      setActionBarData();
    };

    var updateConversations = function(options) {
      options = options || {};
      if (!options.changes) {
        $scope.loading = true;
      }
      return MessageContacts.list().then(function(messages) {
        options.messages = messages;
        setMessages(options);
        $scope.loading = false;
      });
    };

    $scope.markConversationRead = function(docs) {
      var ids = _.pluck(docs, '_id');
      var conversation = _.find($scope.messages, function(message) {
        return ids.indexOf(message.id) !== -1;
      });
      if (conversation) {
        conversation.read = true;
      }
    };

    $scope.setSelected = function(doc) {
      var refreshing = ($scope.selected && $scope.selected.id) === doc.id;
      $scope.selected = doc;
      $scope.settingSelected(refreshing);
    };

    updateConversations()
      .then(function() {
        if (
          !$state.params.id &&
          $scope.messages.length &&
          !$scope.isMobile() &&
          $state.is('messages.detail')
        ) {
          $timeout(function() {
            var first = $('.inbox-items li').first();
            var state = {
              id: first.attr('data-record-id'),
              type: first.attr('data-record-type'),
            };
            $state.go('messages.detail', state, { location: 'replace' });
          });
        }
      })
      .catch(function(err) {
        $log.error('Error fetching contact', err);
      });

    $scope.$on('ClearSelected', function() {
      $scope.selected = null;
    });

    var changeListener = Changes({
      key: 'messages-list',
      callback: function() {
        updateConversations({ changes: true });
      },
      filter: function(change) {
        if ($scope.currentTab !== 'messages') {
          return false;
        }
        return (
          change.doc.kujua_message || change.doc.sms_message || change.deleted
        );
      },
    });

    var setActionBarData = function() {
      $scope.setLeftActionBar({
        hasResults: $scope.messages.length > 0,
        exportFn: function() {
          Export($scope.filters, 'messages');
        },
      });
    };

    setActionBarData();

    $scope.$on('$destroy', changeListener.unsubscribe);

    if ($stateParams.tour) {
      Tour.start($stateParams.tour);
    }
  });
