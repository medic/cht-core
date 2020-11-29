angular.module('inboxServices').service('Geolocation',
  function(
    $log,
    $q,
    $window
  ) {
    'use strict';
    'ngInject';

    return function() {

      try {
        if ($window.medicmobile_android && typeof $window.medicmobile_android.getLocationPermissions === 'function') {
          $window.medicmobile_android.getLocationPermissions();
        }
      } catch(err) {
        $log.warn('Error trying to get location permissions from Android', err);
        // attempt to get location anyway...
      }

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
