import { createAction, Store } from '@ngrx/store';

import { createMultiValueAction, createSingleValueAction } from '@mm-actions/actionUtils';

export const Actions = {
  updateReplicationStatus: createSingleValueAction('UPDATE_REPLICATION_STATUS', 'replicationStatus'),
  setAndroidAppVersion: createSingleValueAction('SET_ANDROID_APP_VERSION', 'androidAppVersion'),
  setCurrentTab: createSingleValueAction('SET_CURRENT_TAB', 'currentTab'),
  setSnapshotData: createSingleValueAction('SET_SNAPSHOT_DATA', 'snapshotData'),
  setSnackbarContent: createMultiValueAction('SET_SNACKBAR_CONTENT'),
  setLoadingContent: createSingleValueAction('SET_LOADING_CONTENT', 'loadingContent'),
  setShowContent: createSingleValueAction('SET_SHOW_CONTENT', 'showContent'),
  setForms: createSingleValueAction('SET_FORMS', 'forms'),
  clearFilters: createSingleValueAction('CLEAR_FILTERS', 'skip'),
  setFilter: createSingleValueAction('SET_FILTER', 'filter'),
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
  setProcessingReportVerification: createSingleValueAction('SET_PROCESSING_REPORT_VERIFICATION', 'loading'),
  setUnreadCount: createSingleValueAction('SET_UNREAD_COUNT', 'unreadCount'),
  updateUnreadCount: createSingleValueAction('UPDATE_UNREAD_COUNT', 'unreadCount'),
  setTranslationsLoaded: createAction('SET_TRANSLATIONS_LOADED'),
  setUserFacilityIds: createSingleValueAction('SET_USER_FACILITY_IDS', 'userFacilityIds'),
  setUserContactId: createSingleValueAction('SET_USER_CONTACT_ID', 'userContactId'),
  setTrainingCardFormId: createSingleValueAction('SET_TRAINING_CARD_FORM_ID', 'trainingCardFormId'),
  setSidebarMenu: createSingleValueAction('SET_SIDEBAR_MENU', 'sidebarMenu'),
  closeSidebarMenu: createAction('CLOSE_SIDEBAR_MENU'),
  openSidebarMenu: createAction('OPEN_SIDEBAR_MENU'),
  setSearchBar: createSingleValueAction('SET_SEARCH_BAR', 'searchBar'),
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

  setSnackbarContent(message?, action?) {
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

  settingSelected() {
    this.store.dispatch(Actions.setLoadingContent(false));
    this.setShowContent(true);
  }

  clearFilters(skip?) {
    return this.store.dispatch(Actions.clearFilters(skip));
  }

  setFilter(filter) {
    return this.store.dispatch(Actions.setFilter(filter));
  }

  setSidebarFilter(sidebarFilter) {
    return this.store.dispatch(Actions.setSidebarFilter(sidebarFilter));
  }

  setSearchBar(searchBar) {
    return this.store.dispatch(Actions.setSearchBar(searchBar));
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

  setProcessingReportVerification(loading) {
    return this.store.dispatch(Actions.setProcessingReportVerification(loading));
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

  setUserFacilityIds(userFacilityIds) {
    return this.store.dispatch(Actions.setUserFacilityIds(userFacilityIds));
  }

  setUserContactId(userContactId) {
    return this.store.dispatch(Actions.setUserContactId(userContactId));
  }

  setTrainingCardFormId(trainingCard) {
    return this.store.dispatch(Actions.setTrainingCardFormId(trainingCard));
  }

  setSidebarMenu(sidebarMenu) {
    return this.store.dispatch(Actions.setSidebarMenu(sidebarMenu));
  }

  openSidebarMenu() {
    return this.store.dispatch(Actions.openSidebarMenu());
  }

  closeSidebarMenu() {
    return this.store.dispatch(Actions.closeSidebarMenu());
  }

}
