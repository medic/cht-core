angular.module('inboxServices').factory('Actions',
  function() {
    'use strict';

    return function(dispatch) {

      function createSetCancelCallbackAction(cancelCallback) {
        return {
          type: 'SET_CANCEL_CALLBACK',
          payload: {
            cancelCallback: cancelCallback
          }
        };
      }

      function createSetEnketoErrorAction(error) {
        return {
          type: 'SET_ENKETO_ERROR',
          payload: {
            error: error
          }
        };
      }

      function createSetEnketoEditedStatusAction(edited) {
        return {
          type: 'SET_ENKETO_EDITED_STATUS',
          payload: {
            edited: edited
          }
        };
      }

      function createSetEnketoSavingStatusAction(saving) {
        return {
          type: 'SET_ENKETO_SAVING_STATUS',
          payload: {
            saving: saving
          }
        };
      }

      return {
        clearCancelCallback: function() {
          dispatch(createSetCancelCallbackAction(null));
        },

        setCancelCallback: function(cancelCallback) {
          dispatch(createSetCancelCallbackAction(cancelCallback));
        },

        setEnketoError: function(error) {
          dispatch(createSetEnketoErrorAction(error));
        },

        setEnketoEditedStatus: function(edited) {
          dispatch(createSetEnketoEditedStatusAction(edited));
        },

        setEnketoSavingStatus: function(saving) {
          dispatch(createSetEnketoSavingStatusAction(saving));
        }
      };
    };
  }
);
