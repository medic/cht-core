/**
 * Module to ensure changes listeners are singletons. Registering a
 * listener with this module will replace the previously registered
 * listener.
 */
(function () {

  'use strict';
  
  var inboxServices = angular.module('inboxServices');
  
  inboxServices.factory('Changes', ['db',

    function(db) {

      var callbacks = {};
      var inited = false;
      
      return function(key, callback) {
        if (!callback) {
          callback = key;
          key = 'unlabelled';
        }
        callbacks[key] = callback;
        if (!inited) {
          inited = true;
          db.changes({ filter: 'medic/data_records' }, function(err, data) {
            if (!err && data && data.results) {
              Object.keys(callbacks).forEach(function(key) {
                callbacks[key](data.results);
              });
            }
          });
        }
      };

    }

  ]);
  
}());