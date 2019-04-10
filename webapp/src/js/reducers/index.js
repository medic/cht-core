(function() {
  const redux = require('redux');
  const global = require('./global');
  const contacts = require('./contacts');
  const reports = require('./reports');

  const rootReducer = redux.combineReducers({
    global,
    contacts,
    reports
  });

  angular.module('inboxServices').constant('RootReducer', rootReducer);
}());
