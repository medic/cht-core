const reselect = require('reselect');

angular.module('inboxServices').factory('Selectors', function () {
  const getCancelCallback = state => state.cancelCallback;
  const getEnketoStatus = state => state.enketoStatus;
  const getEnketoEditedStatus = state => state.enketoStatus.edited;
  const getEnketoSavingStatus = state => state.enketoStatus.saving;
  const getEnketoError = state => state.enketoStatus.error;
  const getLoadingContent = state => state.loadingContent;
  const getLoadingSelectedChildren = state => state.loadingSelectedChildren;
  const getLoadingSelectedReports = state => state.loadingSelectedReports;
  const getLoadingSubActionBar = state => state.loadingSubActionBar;
  const getSelectMode = state => state.selectMode;
  const getSelected = state => state.selected;
  const getShowActionBar = state => state.showActionBar;
  const getShowContent = state => state.showContent;

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

  return {
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
    getShowContent
  };
});
