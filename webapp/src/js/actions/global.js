const actionTypes = require('./actionTypes');

angular.module('inboxServices').factory('GlobalActions',
  function(
    $state,
    $stateParams,
    $timeout,
    ActionUtils,
    LiveList,
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

      function setAndroidAppVersion(androidAppVersion) {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.SET_ANDROID_APP_VERSION, 'androidAppVersion', androidAppVersion));
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

      function setForms(forms) {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.SET_FORMS, 'forms', forms));
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

      function updateReplicationStatus(replicationStatus) {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.UPDATE_REPLICATION_STATUS, 'replicationStatus', replicationStatus));
      }

      function setLoadingShowContent(id) {
        setLoadingContent(id);
        setShowContent(true);
      }

      function settingSelected(refreshing) {
        setLoadingContent(false);
        $timeout(function() {
          setShowContent(true);
          setShowActionBar(true);
          if (!refreshing) {
            $timeout(function() {
              $('.item-body').scrollTop(0);
            });
          }
        });
      }

      /**
       * Unset the selected item without navigation
       */
      function unsetSelected() {
        setShowContent(false);
        setLoadingContent(false);
        setShowActionBar(false);
        setTitle();
        dispatch({ type: actionTypes.CLEAR_SELECTED });
        LiveList['contacts'].clearSelected();
        LiveList['contact-search'].clearSelected();
        LiveList['reports'].clearSelected();
        LiveList['report-search'].clearSelected();
        $('#reports-list input[type="checkbox"]').prop('checked', false);
      }

      /**
       * Clear the selected item - may update the URL
       */
      function clearSelected() {
        if ($state.current.name === 'contacts.deceased') {
          $state.go('contacts.detail', { id: $stateParams.id });
        } else if ($stateParams.id) {
          $state.go($state.current.name, { id: null });
        } else {
          unsetSelected();
        }
      }

      return {
        clearCancelCallback,
        clearFilters,
        clearRightActionBar,
        clearSelected,
        setAndroidAppVersion,
        setCancelCallback,
        setCurrentTab,
        setEnketoError,
        setEnketoEditedStatus,
        setEnketoSavingStatus,
        setFacilities,
        setFilter,
        setFilters,
        setForms,
        setIsAdmin,
        setLeftActionBar,
        setLastChangedDoc,
        setLoadingContent,
        setLoadingShowContent,
        setLoadingSubActionBar,
        setRightActionBar,
        setRightActionBarVerified,
        setSelectMode,
        setShowActionBar,
        setShowContent,
        setTitle,
        setUnreadCount,
        setVersion,
        updateReplicationStatus,
        updateUnreadCount,
        unsetSelected,

        settingSelected
      };
    };
  }
);
