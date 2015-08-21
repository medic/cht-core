var _ = require('underscore');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('Cache', ['Changes',
    function(Changes) {

      var caches = [];

      Changes('cache', function(change) {
        var newRecord = change.changes[0].rev.indexOf('1-') === 0;
        caches.forEach(function(cache) {
          if (newRecord || _.some(cache.docs, function(doc) {
            return doc._id === change.id;
          })) {
            cache.docs = null;
            cache.pending = false;
          }
        });
      });

      return function(getResult) {

        var cache = {
          docs: null,
          pending: false,
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
          getResult(function(err, result) {
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
