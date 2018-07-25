angular.module('inboxServices').service('MRDT',
  function(
    $log,
    $q,
    $window
  ) {
    'use strict';
    'ngInject';

    var current;

    return {
      enabled: function() {
        try {
          return !!(
            $window.medicmobile_android &&
            typeof $window.medicmobile_android.mrdt_available === 'function' &&
            $window.medicmobile_android.mrdt_available()
          );
        } catch (err) {
          $log.error(err);
          return false;
        }
      },
      verify: function() {
        current = $q.defer();
        $window.medicmobile_android.mrdt_verify();
        return current.promise;
      },
      respond: function(image) {
        if (current) {
          current.resolve(image);
        }
      },
    };
  }
);
