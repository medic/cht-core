const actionTypes = require('./actionTypes');

angular.module('inboxServices').factory('ContactsActions',
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

      function setLoadingSummary(value) {
        dispatch(createSingleValueAction(actionTypes.SET_LOADING_SUMMARY, 'loadingSummary', value));
      }

      return {
        setLoadingSummary
      };
    };
  }
);
