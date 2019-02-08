angular.module('inboxServices').factory('Actions',
  function() {
    'ngInject';
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

      return {
        clearCancelCallback: function() {
          dispatch(createSetCancelCallbackAction(null));
        },

        setCancelCallback: function(cancelCallback) {
          dispatch(createSetCancelCallbackAction(cancelCallback));
        }
      };
    };
  }
);
