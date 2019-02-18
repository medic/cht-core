angular.module('inboxServices').factory('Selectors', function () {
  var getCancelCallback = function(state) { return state.cancelCallback; };
  var getEnketoStatus = function(state) { return state.enketoStatus; };
  var getEnketoEditedStatus = function(state) { return state.enketoStatus.edited; };
  var getEnketoSavingStatus = function(state) { return state.enketoStatus.saving; };
  var getEnketoError = function(state) { return state.enketoStatus.error; };
  var getLoadingSelectedChildren = function(state) { return state.loadingSelectedChildren; };
  var getLoadingSelectedReports = function(state) { return state.loadingSelectedReports; };
  var getSelectMode = function(state) { return state.selectMode; };
  var getSelected = function(state) { return state.selected; };

  return {
    getCancelCallback: getCancelCallback,
    getEnketoStatus: getEnketoStatus,
    getEnketoEditedStatus: getEnketoEditedStatus,
    getEnketoSavingStatus: getEnketoSavingStatus,
    getEnketoError: getEnketoError,
    getLoadingSelectedChildren: getLoadingSelectedChildren,
    getLoadingSelectedReports: getLoadingSelectedReports,
    getSelectMode: getSelectMode,
    getSelected: getSelected
  };
});
