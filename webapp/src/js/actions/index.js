(function () {

  'use strict';

  require('./global');
  require('./analytics');
  require('./contacts');
  require('./messages');
  require('./reports');
  require('./services');
  require('./target-aggregates');
  require('./tasks');

  angular.module('inboxServices').constant('ActionUtils', {
    createSingleValueAction: function(type, valueName, value) {
      return {
        type,
        payload: {
          [valueName]: value,
        }
      };
    }
  });

}());
