var _ = require('underscore');

angular
  .module('inboxControllers')
  .controller('MessagesCtrl', function(
    $log,
    $ngRedux,
    $scope,
    $state,
    $stateParams,
    $timeout,
    Changes,
    Export,
    MessageContacts,
    MessageListUtils,
    MessagesActions,
    Selectors,
    Tour
  ) {
    'use strict';
    'ngInject';

    const ctrl = this;
    const mapStateToTarget = function(state) {
      return {
        selectedMessage: Selectors.getSelectedMessage(state)
      };
    };
    const mapDispatchToTarget = function(dispatch) {
      const messagesActions = MessagesActions(dispatch);
      return {
        setSelectedMessage: messagesActions.setSelectedMessage
      };
    };
    const unsubscribe = $ngRedux.connect(mapStateToTarget, mapDispatchToTarget)(ctrl);

    $scope.allLoaded = false;
    $scope.messages = [];
    ctrl.setSelectedMessage(null);
    ctrl.loading = true;

    var setMessages = function(options) {
      options = options || {};
      if (options.changes) {
        MessageListUtils.removeDeleted($scope.messages, options.messages);
        var selectedChanged = MessageListUtils.mergeUpdated(
          $scope.messages,
          options.messages,
          ctrl.selectedMessage && ctrl.selectedMessage.id
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
        ctrl.loading = true;
      }
      return MessageContacts.list().then(function(messages) {
        options.messages = messages;
        setMessages(options);
        ctrl.loading = false;
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
      var refreshing = (ctrl.selectedMessage && ctrl.selectedMessage.id) === doc.id;
      ctrl.setSelectedMessage(doc);
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
      ctrl.setSelectedMessage(null);
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
          (change.doc && change.doc.kujua_message) ||
          (change.doc && change.doc.sms_message) ||
          change.deleted
        );
      },
    });

    var setActionBarData = function() {
      $scope.setLeftActionBar({
        hasResults: $scope.messages.length > 0,
        exportFn: function() {
          Export('messages', $scope.filters, { humanReadable: true });
        },
      });
    };

    setActionBarData();

    $scope.$on('$destroy', function() {
      unsubscribe();
      changeListener.unsubscribe();
    });

    if ($stateParams.tour) {
      Tour.start($stateParams.tour);
    }
  });
