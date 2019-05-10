const actionTypes = require('./actionTypes');

angular.module('inboxServices').factory('AnalyticsActions',
  function(
    ActionUtils
  ) {
    'use strict';
    'ngInject';

    return function(dispatch) {

      function setSelectedAnalytics(selected) {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.SET_SELECTED_ANALYTICS, 'selected', selected));
      }

      return {
        setSelectedAnalytics
      };
    };
  }
);
