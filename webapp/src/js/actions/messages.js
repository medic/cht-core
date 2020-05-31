const actionTypes = require('./actionTypes');

angular.module('inboxServices').factory('MessagesActions',
  function(
    $log,
    ActionUtils,
    GlobalActions,
    MarkRead,
    Selectors
  ) {
    'use strict';
    'ngInject';

    return function(dispatch) {

      const globalActions = GlobalActions(dispatch);

      function removeMessageFromSelectedConversation(id) {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.REMOVE_MESSAGE_FROM_SELECTED_CONVERSATION, 'id', id));
      }

      function setMessagesError(value) {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.SET_MESSAGES_ERROR, 'error', value));
      }

      function setSelectedConversation(selected) {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.SET_SELECTED_CONVERSATION, 'selected', selected));
      }

      function updateSelectedConversation(selected) {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.UPDATE_SELECTED_CONVERSATION, 'selected', selected));
      }

      function setConversations(conversations) {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.SET_CONVERSATIONS, 'conversations', conversations));
      }

      function setSelected(doc) {
        dispatch(function(dispatch, getState) {
          const selected = Selectors.getSelectedConversation(getState());
          const refreshing = (selected && selected.id) === doc.id;
          setSelectedConversation(doc);
          globalActions.settingSelected(refreshing);
        });
      }

      function markSelectedConversationRead() {
        dispatch((dispatch, getState) => {
          const selected = Selectors.getSelectedConversation(getState());
          dispatch({ type: actionTypes.MARK_SELECTED_CONVERSATION_READ });
          const docs = selected.messages.map(message => message.doc);
          MarkRead(docs).catch(err => $log.error('Error marking all as read', err));
        });
      }

      return {
        markSelectedConversationRead,
        removeMessageFromSelectedConversation,
        setMessagesError,
        setSelectedConversation,
        updateSelectedConversation,

        setConversations,
        setSelected,
      };
    };
  }
);
