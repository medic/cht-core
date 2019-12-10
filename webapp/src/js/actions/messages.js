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

      function markSelectedConversationRead() {
        dispatch((dispatch, getState) => {
          const selected = Selectors.getSelectedMessage(getState());
          dispatch({ type: actionTypes.MARK_SELECTED_CONVERSATION_READ });
          const docs = selected.messages.map(message => message.doc);
          MarkRead(docs).catch(err => $log.error('Error marking all as read', err));
        });
      }

      return {
        addSelectedMessage,
        markSelectedConversationRead,
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
