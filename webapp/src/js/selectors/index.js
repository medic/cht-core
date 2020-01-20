const reselect = require('reselect');

// Global
const getGlobalState = state => state.global;
const getActionBar = state => getGlobalState(state).actionBar;
const getAndroidAppVersion = state => getGlobalState(state).androidAppVersion;
const getCancelCallback = state => getGlobalState(state).cancelCallback;
const getCurrentTab = state => getGlobalState(state).currentTab;
const getEnketoStatus = state => getGlobalState(state).enketoStatus;
const getEnketoEditedStatus = state => getGlobalState(state).enketoStatus.edited;
const getEnketoSavingStatus = state => getGlobalState(state).enketoStatus.saving;
const getEnketoError = state => getGlobalState(state).enketoStatus.error;
const getFilters = state => getGlobalState(state).filters;
const getForms = state => getGlobalState(state).forms;
const getIsAdmin = state => getGlobalState(state).isAdmin;
const getLoadingContent = state => getGlobalState(state).loadingContent;
const getLoadingSubActionBar = state => getGlobalState(state).loadingSubActionBar;
const getReplicationStatus = state => getGlobalState(state).replicationStatus;
const getSelectMode = state => getGlobalState(state).selectMode;
const getShowActionBar = state => getGlobalState(state).showActionBar;
const getShowContent = state => getGlobalState(state).showContent;
const getTitle = state => getGlobalState(state).title;
const getUnreadCount = state => getGlobalState(state).unreadCount;

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

// Services
const getServicesState = state => state.services;
const getLastChangedDoc = state => getServicesState(state).lastChangedDoc;

// Tasks
const getTasksState = state => state.tasks;
const getSelectedTask = state => getTasksState(state).selected;
const getLoadTasks = state => getTasksState(state).loaded;

// Target Aggregates
const getTargetAggregatesState = state => state.targetAggregates;
const getTargetAggregates = state => getTargetAggregatesState(state).targetAggregates;
const getSelectedTarget = state => getTargetAggregatesState(state).selected;


angular.module('inboxServices').constant('Selectors', {
  getGlobalState,
  getActionBar,
  getAndroidAppVersion,
  getCancelCallback,
  getCurrentTab,
  getEnketoStatus,
  getEnketoEditedStatus,
  getEnketoSavingStatus,
  getEnketoError,
  getFilters,
  getForms,
  getIsAdmin,
  getLoadingContent,
  getLoadingSubActionBar,
  getReplicationStatus,
  getSelectMode,
  getShowActionBar,
  getShowContent,
  getTitle,
  getUnreadCount,

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
  getSelectedTarget,
});
