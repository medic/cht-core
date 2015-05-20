var _ = require('underscore');

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
      
      return function(options, callback) {
        if (!callback) {
          callback = options;
          options = {};
        }
        _.defaults(options, {
          key: 'unlabelled',
          filter: 'medic/data_records'
        });
        callbacks[options.key] = callback;
        if (!inited) {
          inited = true;
          db.changes({ filter: options.filter }, function(err, data) {
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