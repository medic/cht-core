const actionTypes = require('./actionTypes');

angular.module('inboxServices').factory('TasksActions',
  function(
    ActionUtils
  ) {
    'use strict';
    'ngInject';

    return function(dispatch) {

      function setSelectedTask(selected) {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.SET_SELECTED_TASK, 'selected', selected));
      }

      return {
        setSelectedTask
      };
    };
  }
);
