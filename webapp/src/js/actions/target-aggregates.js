const actionTypes = require('./actionTypes');

angular.module('inboxServices').factory('TargetAggregatesActions',
  function(
    ActionUtils
  ) {
    'use strict';
    'ngInject';

    return (dispatch) => {

      const setSelectedTarget = (selected) => {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.SET_SELECTED_TARGET, 'selected', selected));
      };

      const setSupervisees = (supervisees) => {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.SET_SUPERVISEES, 'supervisees', supervisees));
      };

      const setTargetAggregates = (aggregates) => {
        dispatch(
          ActionUtils.createSingleValueAction(actionTypes.SET_TARGET_AGGREGATES, 'targetAggregates', aggregates)
        );
      };

      return {
        setTargetAggregates,
        setSupervisees,
        setSelectedTarget,
      };
    };
  }
);
