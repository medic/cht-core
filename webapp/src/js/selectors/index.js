angular.module('inboxServices').factory('Selectors', function () {
  // Global
  var getCancelCallback = function(state) { return state.global.cancelCallback; };
  var getEnketoStatus = function(state) { return state.global.enketoStatus; };
  var getEnketoEditedStatus = function(state) { return state.global.enketoStatus.edited; };
  var getEnketoSavingStatus = function(state) { return state.global.enketoStatus.saving; };
  var getEnketoError = function(state) { return state.global.enketoStatus.error; };
  var getSelectMode = function(state) { return state.global.selectMode; };

  // Analytics
  var getSelectedAnalytics = function(state) { return state.analytics.selected; };

  // Contacts
  var getSelectedContact = function(state) { return state.contacts.selected; };

  return {
    getCancelCallback: getCancelCallback,
    getEnketoStatus: getEnketoStatus,
    getEnketoEditedStatus: getEnketoEditedStatus,
    getEnketoSavingStatus: getEnketoSavingStatus,
    getEnketoError: getEnketoError,
    getSelectMode: getSelectMode,

    getSelectedAnalytics: getSelectedAnalytics,

    getSelectedContact: getSelectedContact
  };
});
