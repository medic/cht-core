var _ = require('underscore');

angular.module('inboxControllers').controller('MessagesCtrl', 
  function (
    $log,
    $scope,
    $state,
    $stateParams,
    $timeout,
    Changes,
    Export,
    MessageContacts,
    Tour
  ) {
    'use strict';
    'ngInject';

    var removeDeletedMessages = function(messages) {
      var existingKey;
      var checkExisting = function(updated) {
        return existingKey === updated.key;
      };
      for (var i = $scope.messages.length - 1; i >= 0; i--) {
        existingKey = $scope.messages[i].key;
        if (!_.some(messages, checkExisting)) {
          $scope.messages.splice(i, 1);
        }
      }
    };

    var mergeUpdatedMessages = function(messages) {
      _.each(messages, function(updated) {
        var match = _.find($scope.messages, function(existing) {
          return existing.key === updated.key;
        });
        if (match) {
          if (!_.isEqual(updated.message, match.message)) {
            match.message = updated.message;
            match.read = false;
          }
        } else {
          $scope.messages.push(updated);
        }
        if ($scope.selected && $scope.selected.id === updated.key) {
          $scope.$broadcast('UpdateContactConversation', { silent: true });
        }
      });
    };

    var setMessages = function(options) {
      options = options || {};
      if (options.changes) {
        removeDeletedMessages(options.messages);
        mergeUpdatedMessages(options.messages);
      } else {
        $scope.messages = options.messages || [];
      }
    };

    var updateConversations = function(options) {
      if (!options.changes) {
        $scope.loading = true;
      }
      return MessageContacts().then(function(data) {
        $scope.loading = false;
        options.messages = data;
        setMessages(options);
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

    $scope.allLoaded = false;
    $scope.messages = [];
    $scope.selected = null;
    setMessages();
    updateConversations({ })
      .then(function() {
        if (!$state.params.id &&
            $scope.messages.length &&
            !$scope.isMobile() &&
            $state.is('messages.detail')) {
          $timeout(function() {
            var id = $('.inbox-items li').first().attr('data-record-id');
            $state.go('messages.detail', { id: id }, { location: 'replace' });
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
        return change.doc.kujua_message ||
               change.doc.sms_message ||
               change.deleted;
      }
    });

    $scope.setLeftActionBar({
      exportFn: function() {
        Export($scope.filters, 'messages');
      }
    });

    $scope.$on('$destroy', changeListener.unsubscribe);

    if ($stateParams.tour) {
      Tour.start($stateParams.tour);
    }

  }
);
