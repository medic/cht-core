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

      function addSelectedReport(selected) {
        dispatch(createSingleValueAction(actionTypes.ADD_SELECTED_REPORT, 'selected', selected));
      }

      function removeSelectedReport(id) {
        dispatch(createSingleValueAction(actionTypes.REMOVE_SELECTED_REPORT, 'id', id));
      }

      function setFirstSelectedReportDocProperty(doc) {
        dispatch(createSingleValueAction(actionTypes.SET_FIRST_SELECTED_REPORT_DOC_PROPERTY, 'doc', doc));
      }

      function setFirstSelectedReportFormattedProperty(formatted) {
        dispatch(createSingleValueAction(actionTypes.SET_FIRST_SELECTED_REPORT_FORMATTED_PROPERTY, 'formatted', formatted));
      }

      function setSelectedReports(selected) {
        dispatch(createSingleValueAction(actionTypes.SET_SELECTED_REPORTS, 'selected', selected));
      }

      function updateSelectedReportItem(id, selected) {
        dispatch({
          type: actionTypes.UPDATE_SELECTED_REPORT_ITEM,
          payload: { id, selected }
        });
      }

      return {
        addSelectedReport,
        removeSelectedReport,
        setFirstSelectedReportDocProperty,
        setFirstSelectedReportFormattedProperty,
        setSelectedReports,
        updateSelectedReportItem
      };
    };
  }
);
