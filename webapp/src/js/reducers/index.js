/* eslint-disable angular/one-dependency-per-line */
(function() {
  const redux = require('redux');
  const global = require('./global');
  const contacts = require('./contacts');
  const messages = require('./messages');
  const reports = require('./reports');

  const rootReducer = redux.combineReducers({
    global,
    contacts,
    messages,
    reports
  });

  angular.module('inboxServices').constant('RootReducer', rootReducer);
}());
