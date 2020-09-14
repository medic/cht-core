const getGlobalState = (state) => state.global;
const getServicesState = (state) => state.services;
const getReportsState = (state) => state.reports;
const getMessagesState = (state) => state.messages;

export const Selectors = {
  // global
  getReplicationStatus: (state) => getGlobalState(state).replicationStatus,
  getAndroidAppVersion: (state) => getGlobalState(state).androidAppVersion,
  getCurrentTab: (state) => getGlobalState(state).currentTab,
  getSnackbarContent: (state) => getGlobalState(state).snackbarContent,
  getLoadingContent: state => getGlobalState(state).loadingContent,
  getMinimalTabs: state => getGlobalState(state).minimalTabs,
  getShowContent: state => getGlobalState(state).showContent,
  getSelectMode: state => getGlobalState(state).selectMode,
  getShowActionBar: state => getGlobalState(state).showActionBar,
  getForms: state => getGlobalState(state).forms,

  // services
  getLastChangedDoc: (state) => getServicesState(state).lastChangedDoc,

  // reports
  getReportsList: (state) => getReportsState(state).reports,
  listContains: (state) => (id) => getReportsState(state).reportsById.has(id),
  getSelectedReports: (state) => getReportsState(state).selected,

  // messages
  getMessagesState: state => getMessagesState(state).messages,
  getMessagesError: state => getMessagesState(state).error,
  getSelectedConversation: state => getMessagesState(state).selected,
  getConversations: state => getMessagesState(state).conversations,
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
