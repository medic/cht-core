import { createSelector } from '@ngrx/store';

const getGlobalState = (state) => state.global || {};
const getServicesState = (state) => state.services || {};
const getReportsState = (state) => state.reports || {};
const getMessagesState = (state) => state.messages || {};

export const Selectors = {
  // global
  getReplicationStatus: createSelector(getGlobalState, (globalState) => globalState.replicationStatus),
  getAndroidAppVersion:  createSelector(getGlobalState, (globalState) => globalState.androidAppVersion),
  getCurrentTab: createSelector(getGlobalState, (globalState) => globalState.currentTab),
  getSnackbarContent: createSelector(getGlobalState, (globalState) => globalState.snackbarContent),
  getLoadingContent: createSelector(getGlobalState, (globalState) => globalState.loadingContent),
  getMinimalTabs: createSelector(getGlobalState, (globalState) => globalState.minimalTabs),
  getShowContent: createSelector(getGlobalState, (globalState) => globalState.showContent),
  getSelectMode: createSelector(getGlobalState, (globalState) => globalState.selectMode),
  getShowActionBar: createSelector(getGlobalState, (globalState) => globalState.showActionBar),
  getForms: createSelector(getGlobalState, (globalState) => globalState.forms),
  getFilters: createSelector(getGlobalState, (globalState) => globalState.filters),
  getIsAdmin: createSelector(getGlobalState, (globalState) => globalState.isAdmin),

  // services
  getLastChangedDoc: createSelector(getServicesState, (servicesState) => servicesState.lastChangedDoc),

  // reports
  getReportsList: createSelector(getReportsState, (reportsState) => reportsState.reports),
  listContains: createSelector(getReportsState, (reportsState) => {
    return (id) => reportsState.reportsById.has(id);
  }),
  getSelectedReports: createSelector(getReportsState, (reportsState) => reportsState.selected),

  // messages
  getMessagesError: createSelector(getMessagesState, (messagesState) => messagesState.error),
  getSelectedConversation: createSelector(getMessagesState, (messagesState) => messagesState.selected),
  getConversations: createSelector(getMessagesState, (messagesState) => messagesState.conversations),
};
/*

// Global
const getActionBar = state => getGlobalState(state).actionBar;
const getCancelCallback = state => getGlobalState(state).cancelCallback;
const getEnketoStatus = state => getGlobalState(state).enketoStatus;
const getEnketoEditedStatus = state => getGlobalState(state).enketoStatus.edited;
const getEnketoSavingStatus = state => getGlobalState(state).enketoStatus.saving;
const getEnketoError = state => getGlobalState(state).enketoStatus.error;
const getFilters = state => getGlobalState(state).filters;

const getIsAdmin = state => getGlobalState(state).isAdmin;
const getLoadingSubActionBar = state => getGlobalState(state).loadingSubActionBar;

const getTitle = state => getGlobalState(state).title;
const getUnreadCount = state => getGlobalState(state).unreadCount;
const getPrivacyPolicyAccepted = state => getGlobalState(state).privacyPolicyAccepted;
const getShowPrivacyPolicy = state => getGlobalState(state).showPrivacyPolicy;

// Analytics
const getAnalyticsState = state => state.analytics;
const getSelectedAnalytics = state => getAnalyticsState(state).selected;

// Contacts
const getContactsState = state => state.contacts;
const getContactsLoadingSummary = state => getContactsState(state).loadingSummary;
const getLoadingSelectedContactChildren = state => getContactsState(state).loadingSelectedChildren;
const getLoadingSelectedContactReports = state => getContactsState(state).loadingSelectedReports;
const getSelectedContact = state => getContactsState(state).selected;
const getSelectedContactDoc = reselect.createSelector(
  getSelectedContact,
  selected => selected && selected.doc
);

// Messages
const getMessagesState = state => state.messages;
const getMessagesError = state => getMessagesState(state).error;
const getSelectedConversation = state => getMessagesState(state).selected;
const getConversations = state => getMessagesState(state).conversations;

// Reports
const getReportsState = state => state.reports;
const getSelectedReports = state => getReportsState(state).selected;
const getSelectedReportsSummaries = reselect.createSelector(
  getSelectedReports,
  selected => selected.map(item => item.formatted || item.summary)
);
const getSelectedReportsValidChecks = reselect.createSelector(
  getSelectedReports,
  selected => selected.map(item => item.summary && item.summary.valid || item.formatted &&
    !(item.formatted.errors && item.formatted.errors.length))
);
const getSelectedReportsDocs = reselect.createSelector(
  getSelectedReports,
  selected => selected.map(item => item.doc || item.summary)
);
const getVerifyingReport = state => getReportsState(state).verifyingReport;

// Tasks
const getTasksState = state => state.tasks;
const getSelectedTask = state => getTasksState(state).selected;
const getLoadTasks = state => getTasksState(state).loaded;

// Target Aggregates
const getTargetAggregatesState = state => state.targetAggregates;
const getTargetAggregates = state => getTargetAggregatesState(state).targetAggregates;
const getSelectedTargetAggregate = state => getTargetAggregatesState(state).selected;
const getTargetAggregatesError = state => getTargetAggregatesState(state).error;


angular.module('inboxServices').constant('Selectors', {
  getGlobalState,
  getActionBar,
  getAndroidAppVersion,
  getCancelCallback,
  getEnketoStatus,
  getEnketoEditedStatus,
  getEnketoSavingStatus,
  getEnketoError,
  getFilters,
  getForms,
  getIsAdmin,
  getLoadingContent,
  getLoadingSubActionBar,
  getMinimalTabs,
  getReplicationStatus,
  getSelectMode,
  getShowActionBar,
  getShowContent,
  getTitle,
  getUnreadCount,
  getPrivacyPolicyAccepted,
  getShowPrivacyPolicy,

  getAnalyticsState,
  getSelectedAnalytics,

  getContactsState,
  getContactsLoadingSummary,
  getLoadingSelectedContactChildren,
  getLoadingSelectedContactReports,
  getSelectedContact,
  getSelectedContactDoc,

  getMessagesState,
  getMessagesError,
  getSelectedConversation,
  getConversations,

  getReportsState,
  getSelectedReports,
  getSelectedReportsSummaries,
  getSelectedReportsValidChecks,
  getSelectedReportsDocs,
  getVerifyingReport,

  getLastChangedDoc,

  getTasksState,
  getSelectedTask,
  getLoadTasks,

  getTargetAggregates,
  getSelectedTargetAggregate,
  getTargetAggregatesError,
});
*/
