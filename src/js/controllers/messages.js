const responsive = require('../modules/responsive');

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
        selectedConversation: Selectors.getSelectedConversation(state),
        conversations: Selectors.getConversations(state)
      };
    };
    const mapDispatchToTarget = function(dispatch) {
      const globalActions = GlobalActions(dispatch);
      const messagesActions = MessagesActions(dispatch);
      return {
        setLeftActionBar: globalActions.setLeftActionBar,
        setConversations: messagesActions.setConversations,
        setSelectedConversation: messagesActions.setSelectedConversation,
      };
    };
    const unsubscribe = $ngRedux.connect(mapStateToTarget, mapDispatchToTarget)(ctrl);

    ctrl.setSelectedConversation(null);
    ctrl.loading = true;

    const updateActionBar = () => {
      ctrl.setLeftActionBar({
        hasResults: ctrl.conversations && ctrl.conversations.length > 0,
        exportFn: () => Export('messages', {}, { humanReadable: true })
      });
    };

    const setConversations = (conversations=[], { merge=false }={}) => {
      if (merge) {
        MessageListUtils.removeDeleted(ctrl.conversations, conversations);
        MessageListUtils.mergeUpdated(ctrl.conversations, conversations);
      }
      ctrl.setConversations(conversations);
      updateActionBar();
    };

    const updateConversations = ({ merge=false }={}) => {
      return MessageContacts.list().then(conversations => {
        setConversations(conversations, { merge });
        ctrl.loading = false;
      });
    };

    updateConversations()
      .then(() => {
        if (
          !$state.params.id &&
          ctrl.conversations.length &&
          !responsive.isMobile() &&
          $state.is('messages.detail')
        ) {
          $timeout(() => {
            const first = $('.inbox-items li').first();
            const state = {
              id: first.attr('data-record-id'),
              type: first.attr('data-record-type'),
            };
            $state.go('messages.detail', state, { location: 'replace' });
          });
        }
      })
      .catch(err => $log.error('Error fetching contact', err));

    const changeListener = Changes({
      key: 'messages-list',
      callback: () => updateConversations({ merge: true }),
      filter: change => ctrl.currentTab === 'messages' && MessageContacts.isRelevantChange(change),
    });

    $scope.$on('$destroy', function() {
      unsubscribe();
      changeListener.unsubscribe();
    });

    if ($stateParams.tour) {
      Tour.start($stateParams.tour);
    }
  });
