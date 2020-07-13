angular.module('inboxServices').service('$navigator', function() {
  return navigator;
});

angular.module('inboxServices').service('Geolocation',
  function(
    $log,
    $navigator,
    $q,
    Telemetry
  ) {
    'use strict';
    'ngInject';

    return function() {
      $log.info('Initiating new geolocation watcher');

      let geo;
      let geoError;
      let watcher;
      let deferred;

      const finalise = () => {
        $log.info('Finalising geolocation');
        $navigator.geolocation && $navigator.geolocation.clearWatch(watcher);

        if (geo) {
          // Throughout the life of this handle we managed to get a GPS coordinate at least once
          Telemetry.record('geolocation:success', geo.coords.accuracy);
          deferred.resolve({
            latitude: geo.coords.latitude,
            longitude: geo.coords.longitude,
            altitude: geo.coords.altitude,
            accuracy: geo.coords.accuracy,
            altitudeAccuracy: geo.coords.altitudeAccuracy,
            heading: geo.coords.heading,
            speed: geo.coords.speed
          });
        } else {
          // We never managed to get a handle, here is the latest error
          Telemetry.record(`geolocation:failure:${geoError.code}`);
          deferred.reject({
            code: geoError.code,
            message: geoError.message
          });
        }
      };

      if (!$navigator.geolocation) {
        geoError = {
          code: -1,
          message: 'Geolocation API unavailable.',
        };
      } else {
        watcher = $navigator.geolocation.watchPosition(
          position => {
            $log.info('Geolocation hit', position);
            geo = position;
            if (deferred) {
              finalise();
            }
          },
          error => {
            $log.info('Geolocation error', error);
            geoError = error;
            if (deferred) {
              finalise();
            }
          },
          { enableHighAccuracy: true, timeout: 30 * 1000 });
      }

      const complete = function() {
        $log.info('Geolocation requested');
        deferred = $q.defer();

        if (geo || geoError) {
          finalise();
        }

        return deferred.promise;
      };

      complete.cancel = () => {
        $log.info('Cancelling geolocation');
        $navigator.geolocation && $navigator.geolocation.clearWatch(watcher);
      };

      return complete;
    };
  }
);
