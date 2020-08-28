(function () {

  'use strict';

  require('./services');

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
