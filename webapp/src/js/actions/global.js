const actionTypes = require('./actionTypes');

angular.module('inboxServices').factory('GlobalActions',
  function(
    ActionUtils,
    Selectors
  ) {
    'use strict';
    'ngInject';

    return function(dispatch) {

      function createSetCancelCallbackAction(value) {
        return ActionUtils.createSingleValueAction(actionTypes.SET_CANCEL_CALLBACK, 'cancelCallback', value);
      }

      function clearCancelCallback() {
        dispatch(createSetCancelCallbackAction(null));
      }

      function setCancelCallback(cancelCallback) {
        dispatch(createSetCancelCallbackAction(cancelCallback));
      }

      function createSetEnketoStatusAction(value) {
        return ActionUtils.createSingleValueAction(actionTypes.SET_ENKETO_STATUS, 'enketoStatus', value);
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
        dispatch(ActionUtils.createSingleValueAction(actionTypes.SET_FACILITIES, 'facilities', facilities));
      }

      function setIsAdmin(isAdmin) {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.SET_IS_ADMIN, 'isAdmin', isAdmin));
      }

      function setLastChangedDoc(value) {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.SET_LAST_CHANGED_DOC, 'lastChangedDoc', value));
      }

      function setLoadingContent(loading) {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.SET_LOADING_CONTENT, 'loadingContent', loading));
      }

      function setLoadingSubActionBar(loading) {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.SET_LOADING_SUB_ACTION_BAR, 'loadingSubActionBar', loading));
      }

      function setSelectMode(selectMode) {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.SET_SELECT_MODE, 'selectMode', selectMode));
      }

      function setShowActionBar(showActionBar) {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.SET_SHOW_ACTION_BAR, 'showActionBar', showActionBar));
      }

      function setShowContent(showContent) {
        return dispatch(function(dispatch, getState) {
          const selectMode = Selectors.getSelectMode(getState());
          if (showContent && selectMode) {
            // when in select mode we never show the RHS on mobile
            return;
          }
          dispatch(ActionUtils.createSingleValueAction(actionTypes.SET_SHOW_CONTENT, 'showContent', showContent));
        });
      }

      function setVersion(version) {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.SET_VERSION, 'version', version));
      }

      return {
        clearCancelCallback,
        setCancelCallback,
        setEnketoError,
        setEnketoEditedStatus,
        setEnketoSavingStatus,
        setFacilities,
        setIsAdmin,
        setLastChangedDoc,
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
