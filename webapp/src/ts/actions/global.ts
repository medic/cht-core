import { createAction, Store } from '@ngrx/store';

import { createSingleValueAction, createMultiValueAction } from '@mm-actions/actionUtils';

export const Actions = {
  updateReplicationStatus: createSingleValueAction('UPDATE_REPLICATION_STATUS', 'replicationStatus'),
  setAndroidAppVersion: createSingleValueAction('SET_ANDROID_APP_VERSION', 'androidAppVersion'),
  setCurrentTab: createSingleValueAction('SET_CURRENT_TAB', 'currentTab'),
  setSnapshotData: createSingleValueAction('SET_SNAPSHOT_DATA', 'snapshotData'),
  setSnackbarContent: createMultiValueAction('SET_SNACKBAR_CONTENT'),
  setLoadingContent: createSingleValueAction('SET_LOADING_CONTENT', 'loadingContent'),
  setShowContent: createSingleValueAction('SET_SHOW_CONTENT', 'showContent'),
  setShowActionBar: createSingleValueAction('SET_SHOW_ACTION_BAR', 'showActionBar'),
  setForms: createSingleValueAction('SET_FORMS', 'forms'),
  setLeftActionBar: createSingleValueAction('SET_LEFT_ACTION_BAR', 'left'),
  updateLeftActionBar: createSingleValueAction('UPDATE_LEFT_ACTION_BAR', 'left'),
  setRightActionBar: createSingleValueAction('SET_RIGHT_ACTION_BAR', 'right'),
  setRightActionBarVerified: createSingleValueAction('SET_ACTION_BAR_RIGHT_VERIFIED', 'verified'),
  updateRightActionBar: createSingleValueAction('UPDATE_RIGHT_ACTION_BAR', 'right'),
  clearFilters: createSingleValueAction('CLEAR_FILTERS', 'skip'),
  setFilter: createSingleValueAction('SET_FILTER', 'filter'),
  setFilters: createSingleValueAction('SET_FILTERS', 'filters'),
  setSidebarFilter: createSingleValueAction('SET_SIDEBAR_FILTER', 'sidebarFilter'),
  clearSidebarFilter: createAction('CLEAR_SIDEBAR_FILTER'),
  setSelectMode: createSingleValueAction('SET_SELECT_MODE', 'selectMode'),
  setTitle: createSingleValueAction('SET_TITLE', 'title'),
  setPrivacyPolicyAccepted: createSingleValueAction('SET_PRIVACY_POLICY_ACCEPTED', 'accepted'),
  setShowPrivacyPolicy: createSingleValueAction('SET_SHOW_PRIVACY_POLICY', 'show'),
  setEnketoStatus: createSingleValueAction('SET_ENKETO_STATUS', 'enketoStatus'),
  clearEnketoStatus: createAction('CLEAR_ENKETO_STATUS'),
  navigationCancel: createSingleValueAction('NAVIGATION_CANCEL', 'nextUrl'),
  clearSelected: createAction('CLEAR_SELECTED'),
  setCancelCallback: createSingleValueAction('SET_CANCEL_CALLBACK', 'cancelCallback'),
  setNavigation: createMultiValueAction('SET_NAVIGATION'),
  setPreventNavigation: createSingleValueAction('SET_PREVENT_NAVIGATION', 'preventNavigation'),
  deleteDocConfirm: createSingleValueAction('DELETE_DOC_CONFIRM', 'doc'), // Has Effect
  setLoadingSubActionBar: createSingleValueAction('SET_LOADING_SUB_ACTION_BAR', 'loading'),
  setUnreadCount: createSingleValueAction('SET_UNREAD_COUNT', 'unreadCount'),
  updateUnreadCount: createSingleValueAction('UPDATE_UNREAD_COUNT', 'unreadCount'),
  setTranslationsLoaded: createAction('SET_TRANSLATIONS_LOADED'),
  setUserFacilityId:createSingleValueAction('SET_USER_FACILITY_ID', 'userFacilityId'),
};

export class GlobalActions {
  constructor(private store: Store) {}

  updateReplicationStatus(replicationStatus) {
    return this.store.dispatch(Actions.updateReplicationStatus(replicationStatus));
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

  setSnackbarContent(message, action?) {
    return this.store.dispatch(Actions.setSnackbarContent({ message, action }));
  }

  setLoadingContent(loading) {
    return this.store.dispatch(Actions.setLoadingContent(loading));
  }

  setForms(forms) {
    return this.store.dispatch(Actions.setForms(forms));
  }

  setShowContent(showContent) {
    return this.store.dispatch(Actions.setShowContent(showContent));
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

  clearFilters(skip?) {
    return this.store.dispatch(Actions.clearFilters(skip));
  }

  setFilter(filter) {
    return this.store.dispatch(Actions.setFilter(filter));
  }

  setFilters(filters) {
    return this.store.dispatch(Actions.setFilters(filters));
  }

  setSidebarFilter(sidebarFilter) {
    return this.store.dispatch(Actions.setSidebarFilter(sidebarFilter));
  }

  clearSidebarFilter() {
    return this.store.dispatch(Actions.clearSidebarFilter());
  }

  setSelectMode(selectMode) {
    return this.store.dispatch(Actions.setSelectMode(selectMode));
  }

  setLoadingShowContent(id) {
    this.setLoadingContent(id);
    this.setShowContent(true);
  }

  setTitle(title='') {
    return this.store.dispatch(Actions.setTitle(title));
  }

  unsetComponents() {
    this.setShowContent(false);
    this.setLoadingContent(false);
    this.setShowActionBar(false);
    this.setTitle();
  }

  unsetSelected() {
    this.unsetComponents();
    this.clearSelected();
  }

  setCancelCallback(value) {
    return this.store.dispatch(Actions.setCancelCallback(value));
  }

  setNavigation({ cancelCallback, preventNavigation, cancelTranslationKey, recordTelemetry }) {
    return this.store.dispatch(Actions.setNavigation({
      cancelCallback,
      preventNavigation,
      cancelTranslationKey,
      recordTelemetry,
    }));
  }

  setPreventNavigation(preventNavigation) {
    return this.store.dispatch(Actions.setPreventNavigation(preventNavigation));
  }

  clearNavigation() {
    return this.store.dispatch(Actions.setNavigation({ }));
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

  updateLeftActionBar(value) {
    return this.store.dispatch(Actions.updateLeftActionBar(value));
  }

  setRightActionBar(value) {
    return this.store.dispatch(Actions.setRightActionBar(value));
  }

  setRightActionBarVerified(verified) {
    return this.store.dispatch(Actions.setRightActionBarVerified(verified));
  }

  updateRightActionBar(value) {
    return this.store.dispatch(Actions.updateRightActionBar(value));
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

  clearEnketoStatus() {
    return this.store.dispatch(Actions.clearEnketoStatus());
  }

  navigationCancel(nextUrl?) {
    return this.store.dispatch(Actions.navigationCancel(nextUrl));
  }

  setLoadingSubActionBar(loading) {
    return this.store.dispatch(Actions.setLoadingSubActionBar(loading));
  }

  setUnreadCount(unreadCount) {
    return this.store.dispatch(Actions.setUnreadCount(unreadCount));
  }

  updateUnreadCount(unreadCount) {
    return this.store.dispatch(Actions.updateUnreadCount(unreadCount));
  }

  setTranslationsLoaded() {
    return this.store.dispatch(Actions.setTranslationsLoaded());
  }

  setUserFacilityId(userFacilityId) {
    return this.store.dispatch(Actions.setUserFacilityId(userFacilityId));
  }
}
