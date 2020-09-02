import { globalReducer } from './global';
import { servicesReducer } from './services';

export const reducers = {
  global: globalReducer,
  services: servicesReducer,
}

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
