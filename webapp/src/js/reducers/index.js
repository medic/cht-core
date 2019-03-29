(function() {
  const redux = require('redux');
  const global = require('./global');
  const contacts = require('./contacts');

  const rootReducer = redux.combineReducers({
    global,
    contacts
  });

  angular.module('inboxServices').constant('RootReducer', rootReducer);
}());
