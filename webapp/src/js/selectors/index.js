const reselect = require('reselect');

// Global
const getGlobalState = state => state.global;
const getCancelCallback = state => getGlobalState(state).cancelCallback;
const getEnketoStatus = state => getGlobalState(state).enketoStatus;
const getEnketoEditedStatus = state => getGlobalState(state).enketoStatus.edited;
const getEnketoSavingStatus = state => getGlobalState(state).enketoStatus.saving;
const getEnketoError = state => getGlobalState(state).enketoStatus.error;
const getFacilities = state => getGlobalState(state).facilities;
const getIsAdmin = state => getGlobalState(state).isAdmin;
const getLoadingContent = state => getGlobalState(state).loadingContent;
const getLoadingSelectedChildren = state => getGlobalState(state).loadingSelectedChildren;
const getLoadingSelectedReports = state => getGlobalState(state).loadingSelectedReports;
const getLoadingSubActionBar = state => getGlobalState(state).loadingSubActionBar;
const getSelectMode = state => getGlobalState(state).selectMode;
const getSelected = state => getGlobalState(state).selected;
const getShowActionBar = state => getGlobalState(state).showActionBar;
const getShowContent = state => getGlobalState(state).showContent;
const getVersion = state => getGlobalState(state).version;

const getSelectedSummaries = reselect.createSelector(
  getSelected,
  selected => {
    if (!Array.isArray(selected)) {
      return [];
    }
    return selected.map(item => item.formatted || item.summary);
  }
);
const getSelectedValidChecks = reselect.createSelector(
  getSelected,
  selected => {
    if (!Array.isArray(selected)) {
      return [];
    }
    return selected.map(item => item.summary && item.summary.valid || item.formatted && !(item.formatted.errors && item.formatted.errors.length));
  }
);

// Contacts
const getContactsState = state => state.contacts;
const getLoadingSummary = state => getContactsState(state).loadingSummary;

// Messages
const getMessagesState = state => state.messages;
const getMessagesError = state => getMessagesState(state).error;

// Reports
const getReportsState = state => state.reports;

angular.module('inboxServices').constant('Selectors', {
  getGlobalState,
  getCancelCallback,
  getEnketoStatus,
  getEnketoEditedStatus,
  getEnketoSavingStatus,
  getEnketoError,
  getFacilities,
  getIsAdmin,
  getLoadingContent,
  getLoadingSelectedChildren,
  getLoadingSelectedReports,
  getLoadingSubActionBar,
  getSelectMode,
  getSelected,
  getSelectedSummaries,
  getSelectedValidChecks,
  getShowActionBar,
  getShowContent,
  getVersion,

  getContactsState,
  getLoadingSummary,

  getMessagesState,
  getMessagesError,

  getReportsState
});
