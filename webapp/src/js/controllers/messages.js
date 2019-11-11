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
    GlobalActions,
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
        currentTab: Selectors.getCurrentTab(state),
        selectedMessage: Selectors.getSelectedMessage(state)
      };
    };
    const mapDispatchToTarget = function(dispatch) {
      const globalActions = GlobalActions(dispatch);
      const messagesActions = MessagesActions(dispatch);
      return {
        setLeftActionBar: globalActions.setLeftActionBar,
        setSelectedMessage: messagesActions.setSelectedMessage,
        settingSelected: globalActions.settingSelected
      };
    };
    const unsubscribe = $ngRedux.connect(mapStateToTarget, mapDispatchToTarget)(ctrl);

    ctrl.messages = [];
    ctrl.setSelectedMessage(null);
    ctrl.loading = true;

    var setMessages = function(options) {
      options = options || {};
      if (options.changes) {
        MessageListUtils.removeDeleted(ctrl.messages, options.messages);
        MessageListUtils.mergeUpdated(ctrl.messages, options.messages);
      } else {
        ctrl.messages = options.messages || [];
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
      var conversation = _.find(ctrl.messages, function(message) {
        return ids.indexOf(message.id) !== -1;
      });
      if (conversation) {
        conversation.read = true;
      }
    };

    updateConversations()
      .then(function() {
        if (
          !$state.params.id &&
          ctrl.messages.length &&
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

    var changeListener = Changes({
      key: 'messages-list',
      callback: function() {
        updateConversations({ changes: true });
      },
      filter: function(change) {
        if (ctrl.currentTab !== 'messages') {
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
      ctrl.setLeftActionBar({
        hasResults: ctrl.messages.length > 0,
        exportFn: function() {
          Export('messages', {}, { humanReadable: true });
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
