import { createSelector } from '@ngrx/store';
import { GlobalState } from '@mm-reducers/global';

const getState = (state) => state;
const getGlobalState = (state): GlobalState => state.global || {};
const getServicesState = (state) => state.services || {};
const getReportsState = (state) => state.reports || {};
const getMessagesState = (state) => state.messages || {};
const getContactsState = (state) => state.contacts || {};
const getAnalyticsState = (state) => state.analytics || {};
const getTargetAggregatesState = (state) => state.targetAggregates || {};
const getTasksState = state => state.tasks || {};

export const Selectors = {
  // global
  getSidebarMenu: createSelector(getGlobalState, globalState => globalState.sidebarMenu),
  getProcessingReportVerification: createSelector(getGlobalState, (globalState) => {
    return globalState.processingReportVerification;
  }),
  getReplicationStatus: createSelector(getGlobalState, (globalState) => globalState.replicationStatus),
  getAndroidAppVersion: createSelector(getGlobalState, (globalState) => globalState.androidAppVersion),
  getCurrentTab: createSelector(getGlobalState, (globalState) => globalState.currentTab),
  getSnapshotData: createSelector(getGlobalState, (globalState) => globalState.snapshotData),
  getSnackbarContent: createSelector(getGlobalState, (globalState) => globalState.snackbarContent),
  getLoadingContent: createSelector(getGlobalState, (globalState) => globalState.loadingContent),
  getShowContent: createSelector(getGlobalState, (globalState) => globalState.showContent),
  getSelectMode: createSelector(getGlobalState, (globalState) => globalState.selectMode),
  getForms: createSelector(getGlobalState, (globalState) => globalState.forms),
  getTrainingMaterials: createSelector(getGlobalState, (globalState) => globalState.trainingMaterials),
  getFilters: createSelector(getGlobalState, (globalState) => globalState.filters),
  getSidebarFilter: createSelector(getGlobalState, (globalState) => globalState.sidebarFilter),
  getSearchBar: createSelector(getGlobalState, (globalState) => globalState.searchBar),
  getTitle: createSelector(getGlobalState, (globalState) => globalState.title),
  getPrivacyPolicyAccepted: createSelector(getGlobalState, (globalState) => globalState.privacyPolicyAccepted),
  getShowPrivacyPolicy: createSelector(getGlobalState, (globalState) => globalState.showPrivacyPolicy),
  getBubbleCounter: createSelector(getState, (state) => {
    return {
      ...(getGlobalState(state).bubbleCounter as any),
      task: getTasksState(state).overdue.tasks.length || 0,
    };
  }),

  getTranslationsLoaded: createSelector(getGlobalState, (globalState) => globalState.translationsLoaded),
  getUserFacilityIds: createSelector(getGlobalState, (globalState) => globalState.userFacilityIds),
  getUserContactId: createSelector(getGlobalState, (globalState) => globalState.userContactId),
  getTrainingCardFormId: createSelector(getGlobalState, (globalState) => globalState.trainingCard?.formId),
  getTrainingCard: createSelector(getGlobalState, (globalState) => globalState.trainingCard),
  getLanguage: createSelector(getGlobalState, (globalState) => globalState.language),
  getDirection: createSelector(getGlobalState, (globalState) => globalState.language?.rtl ? 'rtl' : 'ltr'),
  getStorageInfo: createSelector(getGlobalState, (globalState) => globalState.storageInfo),

  // enketo
  getEnketoStatus: createSelector(getGlobalState, (globalState) => globalState.enketoStatus),
  getEnketoEditedStatus: createSelector(getGlobalState, (globalState) => globalState.enketoStatus?.edited),
  getEnketoSavingStatus: createSelector(getGlobalState, (globalState) => globalState.enketoStatus?.saving),
  getEnketoError: createSelector(getGlobalState, (globalState) => globalState.enketoStatus?.error),
  getEnketoForm: createSelector(getGlobalState, (globalState) => globalState.enketoStatus?.form),

  //navigation
  getNavigation: createSelector(getGlobalState, (globalState) => globalState.navigation),
  getCancelCallback: createSelector(getGlobalState, (globalState) => globalState.navigation?.cancelCallback),
  getPreventNavigation: createSelector(getGlobalState, (globalState) => globalState.navigation?.preventNavigation),

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
  getContactIdToLoad: createSelector(getContactsState, (contactState) => contactState.contactIdToLoad),
  getSelectedContact: createSelector(getContactsState, (contactState) => contactState.selected),
  getSelectedContactDoc: createSelector(getContactsState, (contactState) => contactState.selected?.doc),
  getSelectedContactSummary: createSelector(getContactsState, (contactState) => contactState.selected?.summary),
  getSelectedContactChildren: createSelector(getContactsState, (contactState) => contactState.selected?.children),
  getSelectedContactReports: createSelector(getContactsState, (contactState) => contactState.selected?.reports),
  getSelectedContactTasks: createSelector(getContactsState, (contactState) => contactState.selected?.tasks),
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
  getOverdueTasks: createSelector(getTasksState, (tasksState) => tasksState.overdue.tasks),
  getTasksLoaded: createSelector(getTasksState, (tasksState) => tasksState.loaded),
  getSelectedTask: createSelector(getTasksState, (tasksState) => tasksState.selected),
  getLastSubmittedTask: createSelector(getTasksState, (tasksState) => tasksState.taskGroup?.lastSubmittedTask),
  getTaskGroupContact: createSelector(getTasksState, (tasksState) => tasksState.taskGroup?.contact),
  getTaskGroupLoadingContact: createSelector(getTasksState, (tasksState) => tasksState.taskGroup?.loadingContact),
};
