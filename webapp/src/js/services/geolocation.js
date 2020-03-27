angular.module('inboxServices').service('Geolocation',
  function(
    $q
  ) {
    'use strict';
    'ngInject';

    return function() {

      if (!navigator.geolocation) {
        return $q.reject({
          code: -1,
          message: 'Geolocation API unavailable.',
        });
      }

      const options = {
        enableHighAccuracy: true,
        timeout: 300000, // 5 mins
        maximumAge: 1200000, // 20 mins
      };

      return $q(function(resolve, reject) {
        navigator.geolocation.getCurrentPosition(resolve, reject, options);
      })
        .then(function(position) {
          const coordinates = position.coords;
          return {
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
            altitude: coordinates.altitude,
            accuracy: coordinates.accuracy,
            altitudeAccuracy: coordinates.altitudeAccuracy,
            heading: coordinates.heading,
            speed: coordinates.speed
          };
        });

    };

  }
);
