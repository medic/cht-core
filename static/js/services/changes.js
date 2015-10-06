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

      var isNew = function(change) {
        return change.changes[0].rev.indexOf('1-') === 0;
      };

      var collectData = function(change, callback) {
        if (isNew(change)) {
          DB.get()
            .get(change.id)
            .then(function(doc) {
              change.newDoc = doc;
              callback();
            });
        } else {
          callback();
        }
      };

      var notifyAll = function(change) {
        Object.keys(callbacks).forEach(function(key) {
          var options = callbacks[key];
          if (!options.filter || options.filter(change)) {
            options.callback(change);
          }
        });
      };

      if (!E2ETESTING) {
        DB.get()
          .changes({ live: true, since: 'now' })
          .on('change', function(change) {
            collectData(change, function() {
              notifyAll(change);
            });
          });
      }
      return function(options) {
        callbacks[options.key] = options;
      };
    }

  ]);
  
}());