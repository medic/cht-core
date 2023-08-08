const actionTypes = require('./actionTypes');

/**
 * Ideally in redux, actions should import services, and services should
 * not import actions. There appear to be valid use cases for services
 * importing actions in this app however, for example reading and writing
 * the lastChangedDoc property. This means a circular dependency is
 * likely to happen eventually if the importing is happening both ways.
 * For this reason we have a separate ServicesActions for use when a
 * service needs to dispatch an action. In general however this should
 * be avoided, and actions should be dispatched from either components
 * or complex action dispatchers.
 */
angular.module('inboxServices').factory('ServicesActions',
  function(
    ActionUtils
  ) {
    'use strict';
    'ngInject';

    return (dispatch) => {

      const setLastChangedDoc = (value) => {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.SET_LAST_CHANGED_DOC, 'lastChangedDoc', value));
      };

      return {
        setLastChangedDoc
      };
    };
  });
