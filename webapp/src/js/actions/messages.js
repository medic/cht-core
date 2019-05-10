const actionTypes = require('./actionTypes');

angular.module('inboxServices').factory('MessagesActions',
  function(
    ActionUtils
  ) {
    'use strict';
    'ngInject';

    return function(dispatch) {

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
