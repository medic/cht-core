angular.module('inboxServices').factory('Telemetry', function($log, DB) {
  'use strict';
  'ngInject';

  return {
    record: function(key, value) {
      return DB.telemetry.post({
        key: key,
        value: value,
      });
    },
  };
});
