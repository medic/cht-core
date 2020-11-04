import { createAction, Store } from '@ngrx/store';
import { take } from 'rxjs/operators';

import { createSingleValueAction } from './actionUtils';
import { Selectors } from '../selectors';

export const Actions = {
  updateReplicationStatus: createSingleValueAction('UPDATE_REPLICATION_STATUS', 'replicationStatus'),
  setMinimalTabs: createSingleValueAction('SET_MINIMAL_TABS', 'minimalTabs'),
  setAndroidAppVersion: createSingleValueAction('SET_ANDROID_APP_VERSION', 'androidAppVersion'),
  setCurrentTab: createSingleValueAction('SET_CURRENT_TAB', 'currentTab'),
  setSnackbarContent: createSingleValueAction('SET_SNACKBAR_CONTENT', 'content'),
  setLoadingContent: createSingleValueAction('SET_LOADING_CONTENT', 'loadingContent'),
  setShowContent: createSingleValueAction('SET_SHOW_CONTENT', 'showContent'),
  setShowActionBar: createSingleValueAction('SET_SHOW_ACTION_BAR', 'showActionBar'),
  setForms: createSingleValueAction('SET_FORMS', 'forms'),
  setLeftActionBar: createSingleValueAction('SET_LEFT_ACTION_BAR', 'left'),
  clearFilters: createAction('CLEAR_FILTERS'),
  setFilter: createSingleValueAction('SET_FILTER', 'filter'),
  setFilters: createSingleValueAction('SET_FILTERS', 'filters'),
  setSelectMode: createSingleValueAction('SET_SELECT_MODE', 'selectMode'),
  setIsAdmin: createSingleValueAction('SET_IS_ADMIN', 'isAdmin'),
  setTitle: createSingleValueAction('SET_TITLE', 'title'),
  setPrivacyPolicyAccepted: createSingleValueAction('SET_PRIVACY_POLICY_ACCEPTED', 'accepted'),
  setShowPrivacyPolicy: createSingleValueAction('SET_SHOW_PRIVACY_POLICY', 'show'),
  setEnketoStatus: createSingleValueAction('SET_ENKETO_STATUS', 'enketoStatus'),
  navigationCancel: createSingleValueAction('NAVIGATION_CANCEL', 'nextUrl'),
  clearSelected: createAction('CLEAR_SELECTED'),
  setCancelCallback: createSingleValueAction('SET_CANCEL_CALLBACK', 'cancelCallback'),
  deleteDocConfirm: createSingleValueAction('DELETE_DOC_CONFIRM', 'doc'), // Has Effect
}

export class GlobalActions {
  constructor(private store: Store) {}

  updateReplicationStatus(replicationStatus) {
    return this.store.dispatch(Actions.updateReplicationStatus(replicationStatus));
  }

  setMinimalTabs(minimal) {
    return this.store.dispatch(Actions.setMinimalTabs(minimal));
  }

  setAndroidAppVersion(androidAppVersion) {
    return this.store.dispatch(Actions.setAndroidAppVersion(androidAppVersion));
  }

  setCurrentTab(currentTab) {
    return this.store.dispatch(Actions.setCurrentTab(currentTab));
  }

  setSnackbarContent(content) {
    return this.store.dispatch(Actions.setSnackbarContent(content));
  }

  setLoadingContent(loading) {
    return this.store.dispatch(Actions.setLoadingContent(loading));
  }

  setForms(forms) {
    return this.store.dispatch(Actions.setForms(forms));
  }

  setShowContent(showContent) {
    return this.store
      .select(Selectors.getSelectMode)
      .pipe(take(1))
      .subscribe(selectMode => {
        if (showContent && selectMode) {
          // when in select mode we never show the RHS on mobile
          return;
        }

        return this.store.dispatch(Actions.setShowContent(showContent));
      })
  }

  setShowActionBar(showActionBar) {
    return this.store.dispatch(Actions.setShowActionBar(showActionBar));
  }

  settingSelected() {
    this.store.dispatch(Actions.setLoadingContent(false));
    // todo The original code wrapped these 2 next lines in a $timeout
    // I can't see a reason for this, maybe it's because of the actionbar?
    // Test if the actionbar appears before the content is loaded, we might need to refactor this action into two
    // actions that are called from the component and use lifecycle hooks
    this.store.dispatch(Actions.setShowContent(true));
    this.store.dispatch(Actions.setShowActionBar(true));
  }

  clearFilters() {
    return this.store.dispatch(Actions.clearFilters());
  }

  setFilter(filter) {
    return this.store.dispatch(Actions.setFilter(filter));
  }

  setFilters(filters) {
    return this.store.dispatch(Actions.setFilters(filters));
  }

  setSelectMode(selectMode) {
    return this.store.dispatch(Actions.setSelectMode(selectMode));
  }

  setIsAdmin(isAdmin) {
    return this.store.dispatch(Actions.setIsAdmin(isAdmin));
  }

  setLoadingShowContent(id) {
    this.setLoadingContent(id);
    this.setShowContent(true);
  }

  setTitle(title='') {
    return this.store.dispatch(Actions.setTitle(title));
  }

  unsetSelected() {
    this.setShowContent(false);
    this.setLoadingContent(false);
    this.setShowActionBar(false);
    this.setTitle();
    this.clearSelected();
  }

  setCancelCallback(value) {
    return this.store.dispatch(Actions.setCancelCallback(value));
  }

  clearCancelCallback() {
    return this.store.dispatch(Actions.setCancelCallback(null));
  }

  /**
   * Warning! Use carefully because more than one reducer might be listening to this global action.
   */
  clearSelected() {
    return this.store.dispatch(Actions.clearSelected());
  }

  /**
   * Deletes document from DB.
   * This action has effect
   * @param doc
   */
  deleteDocConfirm(doc) {
    return this.store.dispatch(Actions.deleteDocConfirm(doc));
  }

  setLeftActionBar(value) {
    return this.store.dispatch(Actions.setLeftActionBar(value));
  }

  setPrivacyPolicyAccepted(accepted) {
    return this.store.dispatch(Actions.setPrivacyPolicyAccepted(accepted));
  }

  setShowPrivacyPolicy(show) {
    return this.store.dispatch(Actions.setShowPrivacyPolicy(show));
  }

  setEnketoError(error) {
    return this.store.dispatch(Actions.setEnketoStatus({ error }));
  }

  setEnketoEditedStatus(edited) {
    return this.store.dispatch(Actions.setEnketoStatus({ edited }));
  }

  setEnketoSavingStatus(saving) {
    return this.store.dispatch(Actions.setEnketoStatus({ saving }));
  }

  navigationCancel(nextUrl) {
    return this.store.dispatch(Actions.navigationCancel(nextUrl));
  }
}

/*

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

      function setLoadingSubActionBar(loading) {
        dispatch(ActionUtils.createSingleValueAction(
          actionTypes.SET_LOADING_SUB_ACTION_BAR, 'loadingSubActionBar', loading
        ));
      }

      function setUnreadCount(unreadCount) {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.SET_UNREAD_COUNT, 'unreadCount', unreadCount));
      }

      function updateUnreadCount(unreadCount) {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.UPDATE_UNREAD_COUNT, 'unreadCount', unreadCount));
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
        clearRightActionBar,
        deleteDoc,
        navigationCancel,
        openGuidedSetup,
        openTourSelect,
        setLoadingSubActionBar,
        setRightActionBar,
        setRightActionBarVerified,
        setShowActionBar,
        setUnreadCount,
        updateUnreadCount,
      };
    };
  }
);
*/
