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

      function setSelectMode(selectMode) {
        dispatch(createSingleValueAction('SET_SELECT_MODE', 'selectMode', selectMode));
      }

      function setSelected(selected) {
        dispatch(createSingleValueAction('SET_SELECTED', 'selected', selected));
      }

      function createSetSelectedPropertyAction(value) {
        return createSingleValueAction('SET_SELECTED_PROPERTY', 'selected', value);
      }

      function setSelectedAreTasksEnabled(enabled) {
        dispatch(createSetSelectedPropertyAction({ areTasksEnabled: enabled }));
      }

      function setSelectedTasks(tasks) {
        dispatch(createSetSelectedPropertyAction({ tasks: tasks }));
      }

      function setSelectedSummary(summary) {
        dispatch(createSetSelectedPropertyAction({ summary: summary }));
      }

      function setSelectedError(error) {
        dispatch(createSetSelectedPropertyAction({ error: error }));
      }

      function setSelectedContact(contact) {
        dispatch(createSetSelectedPropertyAction({ contact: contact }));
      }

      function setSelectedMessages(messages) {
        dispatch(createSetSelectedPropertyAction({ messages: messages }));
      }

      function addSelectedMessage(message) {
        dispatch(createSingleValueAction('ADD_SELECTED_MESSAGE', 'message', message));
      }

      function removeSelectedMessage(id) {
        dispatch(createSingleValueAction('REMOVE_SELECTED_MESSAGE', 'id', id));
      }

      function createSetFirstSelectedFormattedPropertyAction(value) {
        return createSingleValueAction('SET_FIRST_SELECTED_FORMATTED_PROPERTY', 'formatted', value);
      }

      function setFirstSelectedVerified(verified) {
        dispatch(createSetFirstSelectedFormattedPropertyAction({ verified: verified }));
      }

      function setFirstSelectedOldVerified(oldVerified) {
        dispatch(createSetFirstSelectedFormattedPropertyAction({ oldVerified: oldVerified }));
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
        // Contacts-specific selected actions
        setSelectedAreTasksEnabled: setSelectedAreTasksEnabled,
        setSelectedTasks: setSelectedTasks,
        setSelectedSummary: setSelectedSummary,
        setSelectedError: setSelectedError,
        // Messages-specific selected actions
        setSelectedContact: setSelectedContact,
        setSelectedMessages: setSelectedMessages,
        addSelectedMessage: addSelectedMessage,
        removeSelectedMessage: removeSelectedMessage,
        // Reports-specific selected actions
        setFirstSelectedVerified: setFirstSelectedVerified,
        setFirstSelectedOldVerified: setFirstSelectedOldVerified,
        addSelected: addSelected,
        removeSelected: removeSelected
      };
    };
  }
);
