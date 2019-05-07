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

      function setMessagesError(value) {
        dispatch(createSingleValueAction(actionTypes.SET_MESSAGES_ERROR, 'error', value));
      }

      return {
        setMessagesError
      };
    };
  }
);
