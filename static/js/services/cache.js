(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('Cache', ['Changes',
    function(Changes) {

      var caches = [];

      Changes({
        key: 'cache',
        callback: function(change) {
          caches.forEach(function(cache) {
            if (cache.filter(change.doc)) {
              cache.docs = null;
              cache.pending = false;
            }
          });
        }
      });

      return function(options) {

        var cache = {
          docs: null,
          pending: false,
          filter: options.filter,
          callbacks: []
        };

        caches.push(cache);

        return function(callback) {
          if (cache.docs) {
            return callback(null, cache.docs);
          }
          cache.callbacks.push(callback);
          if (cache.pending) {
            return;
          }
          cache.pending = true;
          options.get(function(err, result) {
            cache.pending = false;
            if (!err) {
              cache.docs = result;
            }
            cache.callbacks.forEach(function(callback) {
              callback(err, result);
            });
            cache.callbacks = [];
          });
        };
      };
    }
  ]);

}()); 
