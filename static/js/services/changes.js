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

      var callback;
      var inited = false;
      
      return function(cb) {
        callback = cb;
        if (!inited) {
          inited = true;
          db.changes({ filter: 'medic/data_records' }, function(err, data) {
            if (!err && data && data.results) {
              callback(data.results);
            }
          });
        }
      };

    }

  ]);
  
}());