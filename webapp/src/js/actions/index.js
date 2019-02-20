angular.module('inboxServices').factory('Actions',
  function() {
    'use strict';

    function createSingleValueAction(type, valueName, value) {
      var action = {
        type: type,
        payload: {}
      };
      action.payload[valueName] = value;
      return action;
    }

    return function(dispatch) {

      function createSetCancelCallbackAction(value) {
        return createSingleValueAction('SET_CANCEL_CALLBACK', 'cancelCallback', value);
      }

      function clearCancelCallback() {
        dispatch(createSetCancelCallbackAction(null));
      }

      function setCancelCallback(cancelCallback) {
        dispatch(createSetCancelCallbackAction(cancelCallback));
      }

      function createSetEnketoStatusAction(value) {
        return createSingleValueAction('SET_ENKETO_STATUS', 'enketoStatus', value);
      }

      function setEnketoError(error) {
        dispatch(createSetEnketoStatusAction({ error: error }));
      }

      function setEnketoEditedStatus(edited) {
        dispatch(createSetEnketoStatusAction({ edited: edited }));
      }

      function setEnketoSavingStatus(saving) {
        dispatch(createSetEnketoStatusAction({ saving: saving }));
      }

      function setLoadingSelectedChildren(loading) {
        dispatch(createSingleValueAction('SET_LOADING_SELECTED_CHILDREN', 'loadingSelectedChildren', loading));
      }

      function setLoadingSelectedReports(loading) {
        dispatch(createSingleValueAction('SET_LOADING_SELECTED_REPORTS', 'loadingSelectedReports', loading));
      }

      function setSelectMode(selectMode) {
        dispatch(createSingleValueAction('SET_SELECT_MODE', 'selectMode', selectMode));
      }

      function setSelected(selected) {
        dispatch(createSingleValueAction('SET_SELECTED', 'selected', selected));
      }

      function updateSelected(selected) {
        dispatch(createSingleValueAction('UPDATE_SELECTED', 'selected', selected));
      }

      function addSelectedMessage(message) {
        dispatch(createSingleValueAction('ADD_SELECTED_MESSAGE', 'message', message));
      }

      function removeSelectedMessage(id) {
        dispatch(createSingleValueAction('REMOVE_SELECTED_MESSAGE', 'id', id));
      }

      function addSelected(selected) {
        dispatch(createSingleValueAction('ADD_SELECTED', 'selected', selected));
      }

      function removeSelected(id) {
        dispatch(createSingleValueAction('REMOVE_SELECTED', 'id', id));
      }

      return {
        clearCancelCallback: clearCancelCallback,
        setCancelCallback: setCancelCallback,
        setEnketoError: setEnketoError,
        setEnketoEditedStatus: setEnketoEditedStatus,
        setEnketoSavingStatus: setEnketoSavingStatus,
        setSelectMode: setSelectMode,
        // Global selected actions
        setSelected: setSelected,
        updateSelected: updateSelected,
        // Contacts-specific selected actions
        setLoadingSelectedChildren: setLoadingSelectedChildren,
        setLoadingSelectedReports: setLoadingSelectedReports,
        // Messages-specific selected actions
        addSelectedMessage: addSelectedMessage,
        removeSelectedMessage: removeSelectedMessage,
        // Reports-specific selected actions
        addSelected: addSelected,
        removeSelected: removeSelected
      };
    };
  }
);
