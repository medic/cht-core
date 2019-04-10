const actionTypes = require('./actionTypes');

angular.module('inboxServices').factory('ReportsActions',
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

      function setReportsErrorSyntax(value) {
        dispatch(createSingleValueAction(actionTypes.SET_REPORTS_ERROR_SYNTAX, 'errorSyntax', value));
      }

      return {
        setReportsErrorSyntax
      };
    };
  }
);
