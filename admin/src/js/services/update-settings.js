angular.module('inboxServices').factory('UpdateSettings',
  function(
    $cacheFactory,
    $http
  ) {
    'ngInject';
    'use strict';

    return function(updates, options) {
      options = options || {};
      const config = {
        params: { replace: options.replace },
        headers: { 'Content-Type': 'application/json' }
      };
      return $http.put('/api/v1/settings', updates, config)
        .then(function() {
          // clear cached settings
          $cacheFactory.get('$http').remove('/api/v1/settings');
        });
    };
  });
