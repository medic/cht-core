angular.module('services').factory('UpdateSettings',
  function(
    $http
  ) {
    'ngInject';
    'use strict';

    return function(updates, options) {
      options = options || {};
      var config = {
        params: { replace: options.replace },
        headers: { 'Content-Type': 'application/json' }
      };
      return $http.put('/api/v1/settings', updates, config);
    };
  }
);
