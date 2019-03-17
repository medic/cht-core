angular.module('inboxServices').factory('Actions',
  function(ContactViewModelGenerator) {
    'use strict';
    'ngInject';

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

      function setSelectMode(selectMode) {
        dispatch(createSingleValueAction('SET_SELECT_MODE', 'selectMode', selectMode));
      }

      function setSelected(selected) {
        dispatch(createSingleValueAction('SET_SELECTED', 'selected', selected));
      }

      function updateSelected(selected) {
        dispatch(createSingleValueAction('UPDATE_SELECTED', 'selected', selected));
      }

      function updateSelectedItem(id, selected) {
        dispatch({
          type: 'UPDATE_SELECTED_ITEM',
          payload: { id: id, selected: selected }
        });
      }

      function setFirstSelectedDocProperty(doc) {
        dispatch(createSingleValueAction('SET_FIRST_SELECTED_DOC_PROPERTY', 'doc', doc));
      }

      function setFirstSelectedFormattedProperty(formatted) {
        dispatch(createSingleValueAction('SET_FIRST_SELECTED_FORMATTED_PROPERTY', 'formatted', formatted));
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

      function setLoadingSelectedChildren(loading) {
        dispatch(createSingleValueAction('SET_LOADING_SELECTED_CHILDREN', 'loadingSelectedChildren', loading));
      }

      function setLoadingSelectedReports(loading) {
        dispatch(createSingleValueAction('SET_LOADING_SELECTED_REPORTS', 'loadingSelectedReports', loading));
      }

      function loadSelectedChildren() {
        return dispatch(function(dispatch, getState) {
          var selected = getState().selected;
          return ContactViewModelGenerator.loadChildren(selected).then(function(children) {
            dispatch(createSingleValueAction('RECEIVE_SELECTED_CHILDREN', 'children', children));
          });
        });
      }

      function loadSelectedReports() {
        return dispatch(function(dispatch, getState) {
          var selected = getState().selected;
          return ContactViewModelGenerator.loadReports(selected).then(function(reports) {
            dispatch(createSingleValueAction('RECEIVE_SELECTED_REPORTS', 'reports', reports));
          });
        });
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
        loadSelectedChildren: loadSelectedChildren,
        loadSelectedReports: loadSelectedReports,
        // Messages-specific selected actions
        addSelectedMessage: addSelectedMessage,
        removeSelectedMessage: removeSelectedMessage,
        // Reports-specific selected actions
        addSelected: addSelected,
        removeSelected: removeSelected,
        updateSelectedItem: updateSelectedItem,
        setFirstSelectedDocProperty: setFirstSelectedDocProperty,
        setFirstSelectedFormattedProperty: setFirstSelectedFormattedProperty
      };
    };
  }
);
