(function() {
  const redux = require('redux');
  const global = require('./global');

  const rootReducer = redux.combineReducers({
    global
  });

  angular.module('inboxServices').constant('RootReducer', rootReducer);
}());
