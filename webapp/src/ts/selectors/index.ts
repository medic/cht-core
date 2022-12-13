import { createSelector } from '@ngrx/store';

const getGlobalState = (state) => state.global || {};
const getServicesState = (state) => state.services || {};
const getReportsState = (state) => state.reports || {};
const getMessagesState = (state) => state.messages || {};
const getContactsState = (state) => state.contacts || {};
const getSelectedContact = (state) => getContactsState(state).selected;

const getEnketoStatus = state => getGlobalState(state).enketoStatus;
const getNavigation = state => getGlobalState(state).navigation;
const getAnalyticsState = (state) => state.analytics || {};
const getTargetAggregatesState = (state) => state.targetAggregates || {};
const getTasksState = state => state.tasks || {};

export const Selectors = {
  // global
  getActionBar: createSelector(getGlobalState, (globalState) => globalState.actionBar),
  getLoadingSubActionBar: createSelector(getGlobalState, (globalState) => globalState.loadingSubActionBar),
  getReplicationStatus: createSelector(getGlobalState, (globalState) => globalState.replicationStatus),
  getAndroidAppVersion:  createSelector(getGlobalState, (globalState) => globalState.androidAppVersion),
  getCurrentTab: createSelector(getGlobalState, (globalState) => globalState.currentTab),
  getSnapshotData: createSelector(getGlobalState, (globalState) => globalState.snapshotData),
  getSnackbarContent: createSelector(getGlobalState, (globalState) => globalState.snackbarContent),
  getLoadingContent: createSelector(getGlobalState, (globalState) => globalState.loadingContent),
  getShowContent: createSelector(getGlobalState, (globalState) => globalState.showContent),
  getSelectMode: createSelector(getGlobalState, (globalState) => globalState.selectMode),
  getShowActionBar: createSelector(getGlobalState, (globalState) => globalState.showActionBar),
  getForms: createSelector(getGlobalState, (globalState) => globalState.forms),
  getFilters: createSelector(getGlobalState, (globalState) => globalState.filters),
  getSidebarFilter: createSelector(getGlobalState, (globalState) => globalState.sidebarFilter),
  getTitle: createSelector(getGlobalState, (globalState) => globalState.title),
  getPrivacyPolicyAccepted: createSelector(getGlobalState, (globalState) => globalState.privacyPolicyAccepted),
  getShowPrivacyPolicy: createSelector(getGlobalState, (globalState) => globalState.showPrivacyPolicy),
  getUnreadCount: createSelector(getGlobalState, (globalState) => globalState.unreadCount),
  getTranslationsLoaded: createSelector(getGlobalState, (globalState) => globalState.translationsLoaded),
  getUserFacilityId: createSelector(getGlobalState, (globalState) => globalState.userFacilityId),

  // enketo
  getEnketoStatus: createSelector(getEnketoStatus, (enketoStatus) => enketoStatus),
  getEnketoEditedStatus: createSelector(getEnketoStatus, (enketoStatus) => enketoStatus?.edited),
  getEnketoSavingStatus: createSelector(getEnketoStatus, (enketoStatus) => enketoStatus?.saving),
  getEnketoError: createSelector(getEnketoStatus, (enketoStatus) => enketoStatus?.error),
  getEnketoForm: createSelector(getEnketoStatus, (enketoStatus) => enketoStatus?.form),

  //navigation
  getNavigation: createSelector(getNavigation, (navigationState) => navigationState),
  getCancelCallback: createSelector(getNavigation, (navState) => navState?.cancelCallback),
  getPreventNavigation: createSelector(getNavigation, (navState) => navState?.preventNavigation),

  // services
  getLastChangedDoc: createSelector(getServicesState, (servicesState) => servicesState.lastChangedDoc),

  // reports
  getReportsList: createSelector(getReportsState, (reportsState) => reportsState.reports),
  getListReport: createSelector(getReportsState, (reportsState, props:any={}) => {
    if (!props.id) {
      return;
    }
    if (!reportsState.reportsById.has(props.id)) {
      return;
    }

    return reportsState.reportsById.get(props.id);
  }),
  listContains: createSelector(getReportsState, (reportsState) => {
    return (id) => reportsState.reportsById.has(id);
  }),
  getSelectedReport: createSelector(getReportsState, (reportsState) => reportsState.selectedReport),
  getSelectedReports: createSelector(getReportsState, (reportsState) => reportsState.selectedReports),
  getSelectedReportDoc: createSelector(getReportsState, (reportsState) => {
    return reportsState.selectedReport?.doc || reportsState.selectedReport?.summary;
  }),
  getVerifyingReport: createSelector(getReportsState, (reportsState) => reportsState.verifyingReport),

  // messages
  getMessagesError: createSelector(getMessagesState, (messagesState) => messagesState.error),
  getSelectedConversation: createSelector(getMessagesState, (messagesState) => messagesState.selected),
  getConversations: createSelector(getMessagesState, (messagesState) => messagesState.conversations),

  // contacts
  getContactsList: createSelector(getContactsState, (contactsState) => contactsState.contacts),
  contactListContains: createSelector(getContactsState, (contactsState) => {
    return (id) => contactsState.contactsById.has(id);
  }),
  getSelectedContact: createSelector(getSelectedContact, (selectedContact) => selectedContact),
  getSelectedContactDoc: createSelector(getSelectedContact, (selectedContact) => selectedContact?.doc),
  getSelectedContactSummary: createSelector(getSelectedContact, (selectedContact) => selectedContact?.summary),
  getSelectedContactChildren: createSelector(getSelectedContact, (selectedContact) => selectedContact?.children),
  getSelectedContactReports: createSelector(getSelectedContact, (selectedContact) => selectedContact?.reports),
  getSelectedContactTasks: createSelector(getSelectedContact, (selectedContact) => selectedContact?.tasks),
  getLoadingSelectedContactReports: createSelector(
    getContactsState,
    (contactsState) => contactsState.loadingSelectedReports
  ),
  getContactsLoadingSummary: createSelector(getContactsState, (contactsState) => contactsState.loadingSummary),

  // analytics
  getAnalyticsModules: createSelector(getAnalyticsState, (analyticsState) => analyticsState.analyticsModules),

  // target Aggregates
  getTargetAggregates: createSelector(
    getTargetAggregatesState,
    (targetAggregatesState) => targetAggregatesState.targetAggregates
  ),
  getSelectedTargetAggregate: createSelector(
    getTargetAggregatesState,
    (targetAggregatesState) => targetAggregatesState.selected
  ),
  getTargetAggregatesLoaded: createSelector(
    getTargetAggregatesState,
    (targetAggregatesState) => targetAggregatesState.targetAggregatesLoaded
  ),
  getTargetAggregatesError: createSelector(
    getTargetAggregatesState,
    (targetAggregatesState) => targetAggregatesState.error
  ),

  // tasks
  getTasksList: createSelector(getTasksState, (tasksState) => tasksState.tasksList),
  getTasksLoaded: createSelector(getTasksState, (tasksState) => tasksState.loaded),
  getSelectedTask: createSelector(getTasksState, (tasksState) => tasksState.selected),
  getLastSubmittedTask: createSelector(getTasksState, (tasksState) => tasksState.taskGroup?.lastSubmittedTask),
  getTaskGroupContact: createSelector(getTasksState, (tasksState) => tasksState.taskGroup?.contact),
  getTaskGroupLoadingContact: createSelector(getTasksState, (tasksState) => tasksState.taskGroup?.loadingContact),
};
