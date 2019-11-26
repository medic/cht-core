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

      function addSelectedMessage(message) {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.ADD_SELECTED_MESSAGE, 'message', message));
      }

      function removeSelectedMessage(id) {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.REMOVE_SELECTED_MESSAGE, 'id', id));
      }

      function setMessagesError(value) {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.SET_MESSAGES_ERROR, 'error', value));
      }

      function setSelectedMessage(selected) {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.SET_SELECTED_MESSAGE, 'selected', selected));
      }

      function updateSelectedMessage(selected) {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.UPDATE_SELECTED_MESSAGE, 'selected', selected));
      }

      function setConversations(conversations) {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.SET_CONVERSATIONS, 'conversations', conversations));
      }

      function setSelected(doc) {
        dispatch(function(dispatch, getState) {
          const selected = Selectors.getSelectedMessage(getState());
          const refreshing = (selected && selected.id) === doc.id;
          setSelectedMessage(doc);
          globalActions.settingSelected(refreshing);
        });
      }

      function markConversationRead() {
        dispatch((dispatch, getState) => {
          const state = getState();
          const selected = Selectors.getSelectedMessage(state);
          const conversations = Selectors.getConversations(state);
          const docs = selected.messages.map(message => message.doc);
          if (docs.length) {
            const ids = docs.map(doc => doc._id);
            const conversation = conversations.find(conversation => {
              return ids.includes(conversation.id);
            });
            if (conversation) {
              conversation.read = true;
              setConversations(conversations);
            }
            MarkRead(docs).catch(err => $log.error('Error marking all as read', err));
          }
        });
      }

      return {
        addSelectedMessage,
        markConversationRead,
        removeSelectedMessage,
        setMessagesError,
        setSelectedMessage,
        updateSelectedMessage,

        setConversations,
        setSelected
      };
    };
  }
);
