angular.module('inboxServices').factory('GlobalActions',
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

      function createSetEnketoStatusAction(value) {
        return createSingleValueAction('SET_ENKETO_STATUS', 'enketoStatus', value);
      }


      function createSetSelectModeAction(value) {
        return createSingleValueAction('SET_SELECT_MODE', 'selectMode', value);
      }

      return {
        clearCancelCallback: function() {
          dispatch(createSetCancelCallbackAction(null));
        },

        setCancelCallback: function(cancelCallback) {
          dispatch(createSetCancelCallbackAction(cancelCallback));
        },

        setEnketoError: function(error) {
          dispatch(createSetEnketoStatusAction({ error: error }));
        },

        setEnketoEditedStatus: function(edited) {
          dispatch(createSetEnketoStatusAction({ edited: edited }));
        },

        setEnketoSavingStatus: function(saving) {
          dispatch(createSetEnketoStatusAction({ saving: saving }));
        },

        setSelectMode: function(selectMode) {
          dispatch(createSetSelectModeAction(selectMode));
        }
      };
    };
  }
);
