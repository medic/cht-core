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
    Actions,
    Changes,
    Export,
    MessageContacts,
    MessageListUtils,
    Selectors,
    Tour
  ) {
    'use strict';
    'ngInject';

    var ctrl = this;
    var mapStateToTarget = function(state) {
      return {
        selected: Selectors.getSelected(state)
      };
    };
    var mapDispatchToTarget = function(dispatch) {
      var actions = Actions(dispatch);
      return {
        setSelected: actions.setSelected
      };
    };
    var unsubscribe = $ngRedux.connect(mapStateToTarget, mapDispatchToTarget)(ctrl);

    $scope.allLoaded = false;
    $scope.messages = [];
    ctrl.setSelected(null);
    $scope.loading = true;

    var setMessages = function(options) {
      options = options || {};
      if (options.changes) {
        MessageListUtils.removeDeleted($scope.messages, options.messages);
        var selectedChanged = MessageListUtils.mergeUpdated(
          $scope.messages,
          options.messages,
          ctrl.selected && ctrl.selected.id
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
      var refreshing = (ctrl.selected && ctrl.selected.id) === doc.id;
      ctrl.setSelected(doc);
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
      ctrl.setSelected(null);
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
