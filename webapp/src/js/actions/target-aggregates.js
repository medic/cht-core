const actionTypes = require('./actionTypes');

angular.module('inboxServices').factory('TargetAggregatesActions',
  function(
    ActionUtils
  ) {
    'use strict';
    'ngInject';

    return (dispatch) => {

      const setSelectedTarget = (selected) => {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.SET_SELECTED_TARGET_AGGREGATE, 'selected', selected));
      };

      const setTargetAggregates = (aggregates) => {
        dispatch(
          ActionUtils.createSingleValueAction(actionTypes.SET_TARGET_AGGREGATES, 'targetAggregates', aggregates)
        );
      };

      const setError = (error) => {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.SET_TARGET_AGGREGATES_ERROR, 'error', error));
      };

      return {
        setTargetAggregates,
        setSelectedTarget,
        setError,
      };
    };
  }
);
