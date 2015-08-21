/**
 * Module to ensure changes listeners are singletons. Registering a
 * listener with this module will replace the previously registered
 * listener with the same key.
 */
(function () {

  'use strict';
  
  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('Changes', ['E2ETESTING', 'DB',

    function(E2ETESTING, DB) {
      var callbacks = {};
      if (!E2ETESTING) {
        DB.get()
          .changes({ live: true, since: 'now' })
          .on('change', function(data) {
            if (data) {
              Object.keys(callbacks).forEach(function(key) {
                callbacks[key](data);
              });
            }
          });
      }
      return function(key, callback) {
        callbacks[key] = callback;
      };
    }

  ]);
  
}());