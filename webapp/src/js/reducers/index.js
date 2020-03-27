(function() {
  const redux = require('redux');

  const global = require('./global');
  const analytics = require('./analytics');
  const contacts = require('./contacts');
  const messages = require('./messages');
  const reports = require('./reports');
  const services = require('./services');
  const tasks = require('./tasks');

  const rootReducer = redux.combineReducers({
    global,
    analytics,
    contacts,
    messages,
    reports,
    services,
    tasks
  });

  angular.module('inboxServices').constant('RootReducer', rootReducer);
}());
