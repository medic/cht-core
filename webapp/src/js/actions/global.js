const actionTypes = require('./actionTypes');

angular.module('inboxServices').factory('GlobalActions',
  function(
    Selectors
  ) {
    'use strict';
    'ngInject';

    function createSingleValueAction(type, valueName, value) {
      const action = {
        type,
        payload: {}
      };
      action.payload[valueName] = value;
      return action;
    }

    return function(dispatch) {

      function createSetCancelCallbackAction(value) {
        return createSingleValueAction(actionTypes.SET_CANCEL_CALLBACK, 'cancelCallback', value);
      }

      function clearCancelCallback() {
        dispatch(createSetCancelCallbackAction(null));
      }

      function setCancelCallback(cancelCallback) {
        dispatch(createSetCancelCallbackAction(cancelCallback));
      }

      function createSetEnketoStatusAction(value) {
        return createSingleValueAction(actionTypes.SET_ENKETO_STATUS, 'enketoStatus', value);
      }

      function setEnketoError(error) {
        dispatch(createSetEnketoStatusAction({ error }));
      }

      function setEnketoEditedStatus(edited) {
        dispatch(createSetEnketoStatusAction({ edited }));
      }

      function setEnketoSavingStatus(saving) {
        dispatch(createSetEnketoStatusAction({ saving }));
      }

      function setFacilities(facilities) {
        dispatch(createSingleValueAction(actionTypes.SET_FACILITIES, 'facilities', facilities));
      }

      function setIsAdmin(isAdmin) {
        dispatch(createSingleValueAction(actionTypes.SET_IS_ADMIN, 'isAdmin', isAdmin));
      }

      function setLoadingContent(loading) {
        dispatch(createSingleValueAction(actionTypes.SET_LOADING_CONTENT, 'loadingContent', loading));
      }

      function setLoadingSubActionBar(loading) {
        dispatch(createSingleValueAction(actionTypes.SET_LOADING_SUB_ACTION_BAR, 'loadingSubActionBar', loading));
      }

      function setSelectMode(selectMode) {
        dispatch(createSingleValueAction(actionTypes.SET_SELECT_MODE, 'selectMode', selectMode));
      }

      function setShowActionBar(showActionBar) {
        dispatch(createSingleValueAction(actionTypes.SET_SHOW_ACTION_BAR, 'showActionBar', showActionBar));
      }

      function setShowContent(showContent) {
        return dispatch(function(dispatch, getState) {
          const selectMode = Selectors.getSelectMode(getState());
          if (showContent && selectMode) {
            // when in select mode we never show the RHS on mobile
            return;
          }
          dispatch(createSingleValueAction(actionTypes.SET_SHOW_CONTENT, 'showContent', showContent));
        });
      }

      function setVersion(version) {
        dispatch(createSingleValueAction(actionTypes.SET_VERSION, 'version', version));
      }

      return {
        clearCancelCallback,
        setCancelCallback,
        setEnketoError,
        setEnketoEditedStatus,
        setEnketoSavingStatus,
        setFacilities,
        setIsAdmin,
        setLoadingContent,
        setLoadingSubActionBar,
        setSelectMode,
        setShowActionBar,
        setShowContent,
        setVersion,
      };
    };
  }
);
