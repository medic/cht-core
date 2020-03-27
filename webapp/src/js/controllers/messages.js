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
        selectedMessage: Selectors.getSelectedMessage(state),
        conversations: Selectors.getConversations(state)
      };
    };
    const mapDispatchToTarget = function(dispatch) {
      const globalActions = GlobalActions(dispatch);
      const messagesActions = MessagesActions(dispatch);
      return {
        setLeftActionBar: globalActions.setLeftActionBar,
        setSelectedMessage: messagesActions.setSelectedMessage,
        settingSelected: globalActions.settingSelected,
        updateSelectedMessage: messagesActions.updateSelectedMessage,
        setConversations: messagesActions.setConversations
      };
    };
    const unsubscribe = $ngRedux.connect(mapStateToTarget, mapDispatchToTarget)(ctrl);

    ctrl.setSelectedMessage(null);
    ctrl.loading = true;

    const updateActionBar = () => {
      ctrl.setLeftActionBar({
        hasResults: ctrl.conversations.length > 0,
        exportFn: () => Export('messages', {}, { humanReadable: true })
      });
    };

    const updateSelected = () => {
      const selectedId = ctrl.selectedMessage && ctrl.selectedMessage.id;
      if (selectedId) {
        const found = ctrl.conversations.some(conversation => conversation.key === selectedId);
        if (found) {
          MessageContacts.conversation(selectedId).then(conversation => {
            ctrl.updateSelectedMessage({ messages: conversation });
          });
        }
      }
    };

    const setConversations = (conversations=[], { merge=false }={}) => {
      if (merge) {
        MessageListUtils.removeDeleted(ctrl.conversations, conversations);
        MessageListUtils.mergeUpdated(ctrl.conversations, conversations);
        ctrl.setConversations(conversations);
        updateSelected();
      } else {
        ctrl.setConversations(conversations);
      }
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
      .catch(err =>$log.error('Error fetching contact', err));

    const changeListener = Changes({
      key: 'messages-list',
      callback: () => updateConversations({ merge: true }),
      filter: change => {
        return ctrl.currentTab === 'messages' && (
          (change.doc && change.doc.kujua_message) ||
          (change.doc && change.doc.sms_message) ||
          change.deleted
        );
      },
    });

    $scope.$on('$destroy', function() {
      unsubscribe();
      changeListener.unsubscribe();
    });

    if ($stateParams.tour) {
      Tour.start($stateParams.tour);
    }
  });
