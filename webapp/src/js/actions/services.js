const actionTypes = require('./actionTypes');

angular.module('inboxServices').factory('ServicesActions',
  function(
    ActionUtils
  ) {
    'use strict';
    'ngInject';

    return function(dispatch) {

      function setLastChangedDoc(value) {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.SET_LAST_CHANGED_DOC, 'lastChangedDoc', value));
      }

      return {
        setLastChangedDoc
      };
    };
  }
);
