import { globalReducer } from './global';
import { servicesReducer } from './services';
import { analyticsReducer } from './analytics';
import { reportsReducer } from './reports';
import { messagesReducer } from './messages';

export const reducers = {
  global: globalReducer,
  services: servicesReducer,
  analytics: analyticsReducer,
  reports: reportsReducer,
  messages: messagesReducer,
};

/*
(function() {
  const redux = require('redux');


  const analytics = require('./analytics');
  const contacts = require('./contacts');
  const messages = require('./messages');
  const reports = require('./reports');

  const targetAggregates = require('./target-aggregates');
  const tasks = require('./tasks');

  const rootReducer = redux.combineReducers({

    analytics,
    contacts,
    messages,
    reports,

    targetAggregates,
    tasks,
  });

  angular.module('inboxServices').constant('RootReducer', rootReducer);
}());
*/
