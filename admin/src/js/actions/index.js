(function () {

  'use strict';

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
