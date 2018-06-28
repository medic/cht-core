angular.module('inboxServices').service('Mrdt',
  function(
    $log,
    $q,
    $window
  ) {
    'use strict';
    'ngInject';

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
        return $window.medicmobile_android.mrdt_verify();
      },
    };
  }
);

