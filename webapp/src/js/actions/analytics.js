const actionTypes = require('./actionTypes');

angular.module('inboxServices').factory('AnalyticsActions',
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

      function setSelectedAnalytics(selected) {
        dispatch(createSingleValueAction(actionTypes.SET_SELECTED_ANALYTICS, 'selected', selected));
      }

      return {
        setSelectedAnalytics
      };
    };
  }
);
