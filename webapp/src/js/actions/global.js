const actionTypes = require('./actionTypes');

angular.module('inboxServices').factory('GlobalActions',
  function(
    $state,
    $timeout,
    ActionUtils,
    LiveList,
    Modal,
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
        dispatch(ActionUtils.createSingleValueAction(
          actionTypes.SET_ANDROID_APP_VERSION, 'androidAppVersion', androidAppVersion
        ));
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

      function setLoadingContent(loading) {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.SET_LOADING_CONTENT, 'loadingContent', loading));
      }

      function setLoadingSubActionBar(loading) {
        dispatch(ActionUtils.createSingleValueAction(
          actionTypes.SET_LOADING_SUB_ACTION_BAR, 'loadingSubActionBar', loading
        ));
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

      function updateReplicationStatus(replicationStatus) {
        dispatch(ActionUtils.createSingleValueAction(
          actionTypes.UPDATE_REPLICATION_STATUS, 'replicationStatus', replicationStatus
        ));
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
       * Unset the selected item
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

      // User wants to cancel current flow, or pressed back button, etc.
      function navigationCancel(transition) {
        return dispatch((dispatch, getState) => {
          const state = getState();
          if (Selectors.getEnketoSavingStatus(state)) {
            // wait for save to finish
            return;
          }

          if (!Selectors.getEnketoEditedStatus(state)) {
            // form hasn't been modified - return immediately
            const cb = Selectors.getCancelCallback(state);
            if (cb) {
              cb();
            }
            return;
          }

          // otherwise data will be discarded so confirm navigation
          Modal({
            templateUrl: 'templates/modals/navigation_confirm.html',
            controller: 'NavigationConfirmCtrl',
            controllerAs: 'navigationConfirmCtrl',
            singleton: true,
          }).then(() => {
            setEnketoEditedStatus(false);
            if (transition) {
              return $state.go(transition.to, transition.params);
            }
            const cb = Selectors.getCancelCallback(getState());
            if (cb) {
              cb();
            }
          });
        });
      }

      function openTourSelect() {
        return Modal({
          templateUrl: 'templates/modals/tour_select.html',
          controller: 'TourSelectCtrl',
          controllerAs: 'tourSelectCtrl',
          singleton: true,
        }).catch(() => {}); // modal dismissed is ok
      }

      function openGuidedSetup() {
        return Modal({
          templateUrl: 'templates/modals/guided_setup.html',
          controller: 'GuidedSetupModalCtrl',
          controllerAs: 'guidedSetupModalCtrl',
          size: 'lg',
        }).catch(() => {}); // modal dismissed is ok
      }

      function deleteDoc(doc) {
        return dispatch((dispatch, getState) => {
          return Modal({
            templateUrl: 'templates/modals/delete_doc_confirm.html',
            controller: 'DeleteDocConfirm',
            controllerAs: 'deleteDocConfirmCtrl',
            model: { doc },
          })
            .then(() => {
              const selectMode = Selectors.getSelectMode(getState());
              if (
                !selectMode &&
                ($state.includes('contacts') || $state.includes('reports'))
              ) {
                $state.go($state.current.name, { id: null });
              }
            })
            .catch(() => {}); // modal dismissed is ok
        });
      }

      return {
        clearCancelCallback,
        clearFilters,
        clearRightActionBar,
        deleteDoc,
        navigationCancel,
        openGuidedSetup,
        openTourSelect,
        setAndroidAppVersion,
        setCancelCallback,
        setCurrentTab,
        setEnketoError,
        setEnketoEditedStatus,
        setEnketoSavingStatus,
        setFilter,
        setFilters,
        setForms,
        setIsAdmin,
        setLeftActionBar,
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
        updateReplicationStatus,
        updateUnreadCount,
        unsetSelected,
        settingSelected
      };
    };
  }
);
