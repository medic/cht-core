angular.module('inboxServices').factory('Telemetry', function($log, DB) {
  'use strict';
  'ngInject';

  return {
    record: function(key, value) {
      console.log(key, value);
    },
  };
});
