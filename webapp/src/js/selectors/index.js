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
const getFacilities = state => getGlobalState(state).facilities;
const getFilters = state => getGlobalState(state).filters;
const getIsAdmin = state => getGlobalState(state).isAdmin;
const getLastChangedDoc = state => getGlobalState(state).lastChangedDoc;
const getLoadingContent = state => getGlobalState(state).loadingContent;
const getLoadingSubActionBar = state => getGlobalState(state).loadingSubActionBar;
const getReplicationStatus = state => getGlobalState(state).replicationStatus;
const getSelectMode = state => getGlobalState(state).selectMode;
const getShowActionBar = state => getGlobalState(state).showActionBar;
const getShowContent = state => getGlobalState(state).showContent;
const getTitle = state => getGlobalState(state).title;
const getUnreadCount = state => getGlobalState(state).unreadCount;
const getVersion = state => getGlobalState(state).version;

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
const getSelectedMessage = state => getMessagesState(state).selected;

// Reports
const getReportsState = state => state.reports;
const getSelectedReports = state => getReportsState(state).selected;
const getSelectedReportsSummaries = reselect.createSelector(
  getSelectedReports,
  selected => selected.map(item => item.formatted || item.summary)
);
const getSelectedReportsValidChecks = reselect.createSelector(
  getSelectedReports,
  selected => selected.map(item => item.summary && item.summary.valid || item.formatted && !(item.formatted.errors && item.formatted.errors.length))
);
const getSelectedReportsDocs = reselect.createSelector(
  getSelectedReports,
  selected => selected.map(item => item.doc || item.summary)
);

// Tasks
const getTasksState = state => state.tasks;
const getSelectedTask = state => getTasksState(state).selected;

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
  getFacilities,
  getFilters,
  getIsAdmin,
  getLastChangedDoc,
  getLoadingContent,
  getLoadingSubActionBar,
  getReplicationStatus,
  getSelectMode,
  getShowActionBar,
  getShowContent,
  getTitle,
  getUnreadCount,
  getVersion,

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
  getSelectedMessage,

  getReportsState,
  getSelectedReports,
  getSelectedReportsSummaries,
  getSelectedReportsValidChecks,
  getSelectedReportsDocs,

  getTasksState,
  getSelectedTask
});
