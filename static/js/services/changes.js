/**
 * Module to ensure changes listeners are singletons. Registering a
 * listener with this module will replace the previously registered
 * listener with the same key.
 */
(function () {

  'use strict';
  
  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('Changes', [
    '$log', 'E2ETESTING', 'DB',

    function($log, E2ETESTING, DB) {

      var callbacks = {};

      var notifyAll = function(change) {
        $log.debug('Change notification firing', change);
        Object.keys(callbacks).forEach(function(key) {
          var options = callbacks[key];
          if (!options.filter || options.filter(change)) {
            options.callback(change);
          }
        });
      };

      if (!E2ETESTING) {
        DB.get()
          .changes({
            live: true,
            since: 'now',
            timeout: false,
            include_docs: true
          })
          .on('change', notifyAll)
          .on('error', function(err) {
            $log.error('Error watching for db changes', err);
          });
      }
      return function(options) {
        callbacks[options.key] = options;
      };
    }

  ]);
  
}());