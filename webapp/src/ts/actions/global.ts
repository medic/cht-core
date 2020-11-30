import { createAction, Store } from '@ngrx/store';
import { take } from 'rxjs/operators';

import { createSingleValueAction } from './actionUtils';
import { Selectors } from '../selectors';

export const Actions = {
  updateReplicationStatus: createSingleValueAction('UPDATE_REPLICATION_STATUS', 'replicationStatus'),
  setMinimalTabs: createSingleValueAction('SET_MINIMAL_TABS', 'minimalTabs'),
  setAndroidAppVersion: createSingleValueAction('SET_ANDROID_APP_VERSION', 'androidAppVersion'),
  setCurrentTab: createSingleValueAction('SET_CURRENT_TAB', 'currentTab'),
  setSnapshotData: createSingleValueAction('SET_SNAPSHOT_DATA', 'snapshotData'),
  setSnackbarContent: createSingleValueAction('SET_SNACKBAR_CONTENT', 'content'),
  setLoadingContent: createSingleValueAction('SET_LOADING_CONTENT', 'loadingContent'),
  setShowContent: createSingleValueAction('SET_SHOW_CONTENT', 'showContent'),
  setShowActionBar: createSingleValueAction('SET_SHOW_ACTION_BAR', 'showActionBar'),
  setForms: createSingleValueAction('SET_FORMS', 'forms'),
  setLeftActionBar: createSingleValueAction('SET_LEFT_ACTION_BAR', 'left'),
  setRightActionBar: createSingleValueAction('SET_RIGHT_ACTION_BAR', 'right'),
  setRightActionBarVerified: createSingleValueAction('SET_ACTION_BAR_RIGHT_VERIFIED', 'verified'),
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
  setLoadingSubActionbar: createSingleValueAction('SET_LOADING_SUB_ACTION_BAR', 'loading'),
  setUnreadCount: createSingleValueAction('SET_UNREAD_COUNT', 'unreadCount'),
  updateUnreadCount: createSingleValueAction('UPDATE_UNREAD_COUNT', 'unreadCount'),
};

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

  setSnapshotData(snapshotData) {
    return this.store.dispatch(Actions.setSnapshotData(snapshotData));
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
      });
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
    this.setShowContent(true);
    this.setShowActionBar(true);
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

  setRightActionBar(value) {
    return this.store.dispatch(Actions.setRightActionBar(value));
  }

  setRightActionBarVerified(verified) {
    return this.store.dispatch(Actions.setRightActionBarVerified(verified));
  }

  clearRightActionBar() {
    return this.store.dispatch(Actions.setRightActionBar({}));
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

  navigationCancel(nextUrl?) {
    return this.store.dispatch(Actions.navigationCancel(nextUrl));
  }

  setLoadingSubActionBar(loading) {
    return this.store.dispatch(Actions.setLoadingSubActionbar(loading));
  }

  setUnreadCount(unreadCount) {
    return this.store.dispatch(Actions.setUnreadCount(unreadCount));
  }

  updateUnreadCount(unreadCount) {
    return this.store.dispatch(Actions.updateUnreadCount(unreadCount));
  }
}
