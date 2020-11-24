import { globalReducer } from '@mm-reducers/global';
import { servicesReducer } from '@mm-reducers/services';
import { analyticsReducer } from '@mm-reducers/analytics';
import { reportsReducer } from '@mm-reducers/reports';
import { messagesReducer } from '@mm-reducers/messages';
import { contactsReducer } from '@mm-reducers/contacts';
import { targetAggregatesReducer } from '@mm-reducers/target-aggregates';
import { tasksReducer } from '@mm-reducers/tasks';

export const reducers = {
  global: globalReducer,
  services: servicesReducer,
  analytics: analyticsReducer,
  reports: reportsReducer,
  messages: messagesReducer,
  targetAggregates: targetAggregatesReducer,
  contacts: contactsReducer,
  tasks: tasksReducer,
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
