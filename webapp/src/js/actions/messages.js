const actionTypes = require('./actionTypes');

angular.module('inboxServices').factory('MessagesActions',
  function() {
    'use strict';

    function createSingleValueAction(type, valueName, value) {
      const action = {
        type,
        payload: {}
      };
      action.payload[valueName] = value;
      return action;
    }

    return function(dispatch) {

      function addSelectedMessage(message) {
        dispatch(createSingleValueAction(actionTypes.ADD_SELECTED_MESSAGE, 'message', message));
      }

      function removeSelectedMessage(id) {
        dispatch(createSingleValueAction(actionTypes.REMOVE_SELECTED_MESSAGE, 'id', id));
      }

      function setMessagesError(value) {
        dispatch(createSingleValueAction(actionTypes.SET_MESSAGES_ERROR, 'error', value));
      }

      function setSelectedMessage(selected) {
        dispatch(createSingleValueAction(actionTypes.SET_SELECTED_MESSAGE, 'selected', selected));
      }

      function updateSelectedMessage(selected) {
        dispatch(createSingleValueAction(actionTypes.UPDATE_SELECTED_MESSAGE, 'selected', selected));
      }

      return {
        addSelectedMessage,
        removeSelectedMessage,
        setMessagesError,
        setSelectedMessage,
        updateSelectedMessage
      };
    };
  }
);
