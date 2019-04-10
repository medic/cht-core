const reselect = require('reselect');

// Global
const getGlobalState = state => state.global;
const getCancelCallback = state => getGlobalState(state).cancelCallback;
const getEnketoStatus = state => getGlobalState(state).enketoStatus;
const getEnketoEditedStatus = state => getGlobalState(state).enketoStatus.edited;
const getEnketoSavingStatus = state => getGlobalState(state).enketoStatus.saving;
const getEnketoError = state => getGlobalState(state).enketoStatus.error;
const getLoadingContent = state => getGlobalState(state).loadingContent;
const getLoadingSelectedChildren = state => getGlobalState(state).loadingSelectedChildren;
const getLoadingSelectedReports = state => getGlobalState(state).loadingSelectedReports;
const getLoadingSubActionBar = state => getGlobalState(state).loadingSubActionBar;
const getSelectMode = state => getGlobalState(state).selectMode;
const getSelected = state => getGlobalState(state).selected;
const getShowActionBar = state => getGlobalState(state).showActionBar;
const getShowContent = state => getGlobalState(state).showContent;

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

// Reports
const getReportsState = state => state.reports;
const getReportsErrorSyntax = state => getReportsState(state).errorSyntax;

angular.module('inboxServices').constant('Selectors', {
  getGlobalState,
  getCancelCallback,
  getEnketoStatus,
  getEnketoEditedStatus,
  getEnketoSavingStatus,
  getEnketoError,
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

  getContactsState,
  getLoadingSummary,

  getReportsState,
  getReportsErrorSyntax
});
