(function() {
  const redux = require('redux');

  const global = require('./global');
  const analytics = require('./analytics');
  const contacts = require('./contacts');
  const messages = require('./messages');
  const reports = require('./reports');
  const tasks = require('./tasks');

  const rootReducer = redux.combineReducers({
    global,
    analytics,
    contacts,
    messages,
    reports,
    tasks
  });

  angular.module('inboxServices').constant('RootReducer', rootReducer);
}());
