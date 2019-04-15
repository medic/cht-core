const actionTypes = require('./actionTypes');

angular.module('inboxServices').factory('TasksActions',
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

      function setSelectedTask(selected) {
        dispatch(createSingleValueAction(actionTypes.SET_SELECTED_TASK, 'selected', selected));
      }

      return {
        setSelectedTask
      };
    };
  }
);
