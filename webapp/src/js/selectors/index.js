const reselect = require('reselect');

angular.module('inboxServices').factory('Selectors', function () {
  const getCancelCallback = state => state.cancelCallback;
  const getEnketoStatus = state => state.enketoStatus;
  const getEnketoEditedStatus = state => state.enketoStatus.edited;
  const getEnketoSavingStatus = state => state.enketoStatus.saving;
  const getEnketoError = state => state.enketoStatus.error;
  const getLoadingSelectedChildren = state => state.loadingSelectedChildren;
  const getLoadingSelectedReports = state => state.loadingSelectedReports;
  const getSelectMode = state => state.selectMode;
  const getSelected = state => state.selected;
  const getLastChangedDoc = state => state.lastChangedDoc;

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
    getLoadingSelectedChildren,
    getLoadingSelectedReports,
    getSelectMode,
    getSelected,
    getSelectedSummaries,
    getSelectedValidChecks,
    getLastChangedDoc
  };
});
