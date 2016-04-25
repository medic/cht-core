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
            if (cache.invalidate(change.doc)) {
              cache.docs = null;
              cache.pending = false;
            }
          });
        }
      });

      /**
       * Caches results and invalidates on document change to reduce
       * the number of requests made to the database.
       *
       * @param options (Object)
       *   - get (function): The function to call to populate the cache.
       *   - invalidate (function) (optional): A predicate which will be
       *     invoked when a database change is detected. Given the
       *     modified doc return true if the cache should be invalidated.
       *     If no invalidate function is provided the cache will never
       *     invalidate.
       */
      return function(options) {

        var cache = {
          docs: null,
          pending: false,
          invalidate: options.invalidate,
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
