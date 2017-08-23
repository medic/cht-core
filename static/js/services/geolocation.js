angular.module('inboxServices').service('Geolocation',
  function(
    $q
  ) {
    'use strict';
    'ngInject';

    return function(callback) {

      if (!navigator.geolocation) {
        return callback({
          code: -1,
          message: 'Geolocation API unavailable.',
        });
      }

      var options = {
        enableHighAccuracy: true,
        timeout: 300000, // 5 mins
        maximumAge: 1200000, // 20 mins
      };

      return $q(function(resolve, reject) {
        navigator.geolocation.getCurrentPosition(resolve, reject, options);
      });

    };

  }
);
