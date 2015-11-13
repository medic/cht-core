var _ = require('underscore'),
    eventEmittingPromise = require('../modules/event-emitting-promise');

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
            if (cache.promise && cache.filter(change)) {
              cache.promise.emit('change', change);
              cache.promise = null;
            }
          });
        }
      });

      return function(options) {
        var cache = {};
        cache.filter = options.filter || function() {
          return true;
        };
        caches.push(cache);
        return function() {
          if (!cache.promise) {
            cache.promise = eventEmittingPromise(options.get());
          }
          return cache.promise;
        };
      };
    }
  ]);

}()); 
