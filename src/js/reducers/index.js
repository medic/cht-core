(function() {
  const redux = require('redux');

  const global = require('./global');
  const analytics = require('./analytics');
  const contacts = require('./contacts');
  const messages = require('./messages');
  const trainings = require('./trainings');
  const reports = require('./reports');
  const services = require('./services');
  const targetAggregates = require('./target-aggregates');
  const tasks = require('./tasks');

  const rootReducer = redux.combineReducers({
    global,
    analytics,
    contacts,
    messages,
    trainings,
    reports,
    services,
    targetAggregates,
    tasks,
  });

  angular.module('inboxServices').constant('RootReducer', rootReducer);
}());
