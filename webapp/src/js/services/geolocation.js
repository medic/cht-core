angular.module('inboxServices').service('Geolocation',
  function(
    $log,
    $q,
    $window,
    Telemetry
  ) {
    'use strict';
    'ngInject';

    const GEO_OPTIONS = {
      enableHighAccuracy: true,
      timeout: 30 * 1000, // give up if coords not received within 30 seconds
      maximumAge: 5 * 60 * 1000 // coords from up to 5 minutes ago are acceptable
    };

    let deferred;
    let geo;
    let geoError;
    let watcher;

    const getAndroidPermission = () => {
      try {
        if (!$window.medicmobile_android || typeof $window.medicmobile_android.getLocationPermissions !== 'function') {
          return true;
        }
        return !!$window.medicmobile_android.getLocationPermissions();
      } catch (err) {
        $log.error(err);
        return true;
      }
    };

    const finalise = () => {
      $log.debug('Finalising geolocation');
      $window.navigator.geolocation && $window.navigator.geolocation.clearWatch(watcher);

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
          message: geoError.message,
        });
      }
    };

    const success = position => {
      $log.debug('Geolocation success', position);
      geo = position;
      if (deferred) {
        finalise();
      }
    };

    const failure = err => {
      $log.debug('Geolocation error', err);
      geoError = err;
      if (deferred) {
        finalise();
      }
    };

    const startWatching = () => {
      $log.debug('Initiating new geolocation watcher');
      if (!$window.navigator.geolocation) {
        geoError = {
          code: -1,
          message: 'Geolocation API unavailable.',
        };
      } else {
        watcher = $window.navigator.geolocation.watchPosition(success, failure, GEO_OPTIONS);
      }
    };

    const stopWatching = () => {
      $log.debug('Cancelling geolocation');
      watcher && $window.navigator.geolocation && $window.navigator.geolocation.clearWatch(watcher);
    };

    return {
      init: () => {
        stopWatching();
        geo = null;
        geoError = null;
        watcher = null;
        deferred = $q.defer();

        if (getAndroidPermission()) {
          startWatching();
        }

        const complete = () => {
          $log.debug('Geolocation requested');
          deferred = $q.defer();

          if (geo || geoError) {
            finalise();
          }

          return deferred.promise;
        };

        complete.cancel = stopWatching;

        return complete;
      },
      permissionRequestResolved: () => {
        startWatching();
      },
    };
  }
);
