const reselect = require('reselect');

// Global
const getGlobalState = state => state.global;
const getActionBar = state => getGlobalState(state).actionBar;
const getCancelCallback = state => getGlobalState(state).cancelCallback;
const getEnketoStatus = state => getGlobalState(state).enketoStatus;
const getEnketoEditedStatus = state => getGlobalState(state).enketoStatus.edited;
const getEnketoSavingStatus = state => getGlobalState(state).enketoStatus.saving;
const getEnketoError = state => getGlobalState(state).enketoStatus.error;
const getFacilities = state => getGlobalState(state).facilities;
const getIsAdmin = state => getGlobalState(state).isAdmin;
const getLastChangedDoc = state => getGlobalState(state).lastChangedDoc;
const getLoadingContent = state => getGlobalState(state).loadingContent;
const getLoadingSubActionBar = state => getGlobalState(state).loadingSubActionBar;
const getSelectMode = state => getGlobalState(state).selectMode;
const getShowActionBar = state => getGlobalState(state).showActionBar;
const getShowContent = state => getGlobalState(state).showContent;
const getVersion = state => getGlobalState(state).version;

// Analytics
const getAnalyticsState = state => state.analytics;
const getSelectedAnalytics = state => getAnalyticsState(state).selected;

// Contacts
const getContactsState = state => state.contacts;
const getContactsLoadingSummary = state => getContactsState(state).contactsLoadingSummary;
const getLoadingSelectedContactChildren = state => getGlobalState(state).loadingSelectedContactChildren;
const getLoadingSelectedContactReports = state => getGlobalState(state).loadingSelectedContactReports;
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
  getCancelCallback,
  getEnketoStatus,
  getEnketoEditedStatus,
  getEnketoSavingStatus,
  getEnketoError,
  getFacilities,
  getIsAdmin,
  getLastChangedDoc,
  getLoadingContent,
  getLoadingSubActionBar,
  getSelectMode,
  getShowActionBar,
  getShowContent,
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
