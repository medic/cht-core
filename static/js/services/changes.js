var _ = require('underscore');

/**
 * Module to ensure changes listeners are singletons. Registering a
 * listener with this module will replace the previously registered
 * listener.
 */
(function () {

  'use strict';
  
  var inboxServices = angular.module('inboxServices');

  var getFilter = function(options) {
    if (options.id) {
      return function(doc) {
        return doc._id === options.id;
      };
    }
    var type = options.type || 'data_record';
    return function(doc) {
      return doc.type === type;
    };
  };

  inboxServices.factory('Changes', ['E2ETESTING', 'DB',

    function(E2ETESTING, DB) {

      var callbacks = {};
      var inited = [];
      
      return function(options, callback) {
        if (!callback) {
          callback = options;
          options = {};
        }
        var type = options.id || options.type || 'data_record';
        options.key = options.key || 'unlabelled';
        callbacks[options.key] = callback;
        if (!_.contains(inited, type)) {
          inited.push(type);
          if (!E2ETESTING) {
            DB.get()
              .changes({ live: true, since: 'now', filter: getFilter(options), include_docs: true })
              .on('change', function(data) {
                if (data) {
                  Object.keys(callbacks).forEach(function(key) {
                    callbacks[key](data);
                  });
                }
              });
          }
        }
      };

    }

  ]);
  
}());