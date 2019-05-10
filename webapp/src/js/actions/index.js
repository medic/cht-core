(function () {

  'use strict';

  require('./global');
  require('./analytics');
  require('./contacts');
  require('./messages');
  require('./reports');
  require('./tasks');

  angular.module('inboxServices').constant('ActionUtils', {
    createSingleValueAction: function(type, valueName, value) {
      const action = {
        type,
        payload: {}
      };
      action.payload[valueName] = value;
      return action;
    }
  });

}());
