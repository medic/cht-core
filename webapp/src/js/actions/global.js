const actionTypes = require('./actionTypes');

angular.module('inboxServices').factory('GlobalActions',
  function(
    ActionUtils,
    Selectors
  ) {
    'use strict';
    'ngInject';

    return function(dispatch) {

      function setLeftActionBar(value) {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.SET_ACTION_BAR_LEFT, 'left', value));
      }

      function createSetRightActionBarAction(value) {
        return ActionUtils.createSingleValueAction(actionTypes.SET_ACTION_BAR_RIGHT, 'right', value);
      }

      function setRightActionBar(value) {
        dispatch(createSetRightActionBarAction(value));
      }

      function clearRightActionBar() {
        dispatch(createSetRightActionBarAction({}));
      }

      function setRightActionBarVerified(value) {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.SET_ACTION_BAR_RIGHT_VERIFIED, 'verified', value));
      }

      function createSetCancelCallbackAction(value) {
        return ActionUtils.createSingleValueAction(actionTypes.SET_CANCEL_CALLBACK, 'cancelCallback', value);
      }

      function clearCancelCallback() {
        dispatch(createSetCancelCallbackAction(null));
      }

      function setCancelCallback(cancelCallback) {
        dispatch(createSetCancelCallbackAction(cancelCallback));
      }

      function setCurrentTab(currentTab) {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.SET_CURRENT_TAB, 'currentTab', currentTab));
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

      function clearFilters() {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.SET_FILTERS, 'filters', {}));
      }

      function setFilter(filter) {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.SET_FILTER, 'filter', filter));
      }

      function setFilters(filters) {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.SET_FILTERS, 'filters', filters));
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

      function setTitle(title) {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.SET_TITLE, 'title', title));
      }

      function setUnreadCount(unreadCount) {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.SET_UNREAD_COUNT, 'unreadCount', unreadCount));
      }

      function updateUnreadCount(unreadCount) {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.UPDATE_UNREAD_COUNT, 'unreadCount', unreadCount));
      }

      function setVersion(version) {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.SET_VERSION, 'version', version));
      }

      return {
        clearCancelCallback,
        clearFilters,
        clearRightActionBar,
        setCancelCallback,
        setCurrentTab,
        setEnketoError,
        setEnketoEditedStatus,
        setEnketoSavingStatus,
        setFacilities,
        setFilter,
        setFilters,
        setIsAdmin,
        setLeftActionBar,
        setLastChangedDoc,
        setLoadingContent,
        setLoadingSubActionBar,
        setRightActionBar,
        setRightActionBarVerified,
        setSelectMode,
        setShowActionBar,
        setShowContent,
        setTitle,
        setUnreadCount,
        updateUnreadCount,
        setVersion
      };
    };
  }
);
