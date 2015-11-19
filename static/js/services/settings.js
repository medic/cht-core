var _ = require('underscore'),
    defaults = require('views/lib/app_settings');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('Settings', ['SettingsP',
    function(SettingsP) {
      return function(callback) {
        var p = SettingsP();
        p.then(function(settings) {
          callback(null, settings);
        });
        p.on('change', function(settings) {
          callback(null, settings);
        });
        p.on('error', callback);
      };
    }
  ]);

  inboxServices.factory('SettingsP',
    ['$q', 'Cache', 'DB',
    function($q, Cache, DB) {

      var cache = Cache({
        get: function(callback) {
          DB.get()
            .get('_design/medic')
            .then(function(ddoc) {
              callback(null, _.defaults(ddoc.app_settings, defaults));
            }).catch(callback);
        },
        filter: function(doc) {
          return doc._id === '_design/medic';
        }
      });

      return function() {
        var listeners = {};

        function emit(event, data) {
          _.each(listeners[event], function(callback) {
            try {
              callback(data);
            } catch(e) {
              console.error('Error triggering listener callback.', event, data, callback);
            }
          });
        }

        var deferred = $q(function(resolve, reject) {
          cache(function(err, settings) {
            if (err) {
              emit('error', err);
              return reject(err);
            }
            emit('change', settings);
            resolve(settings);
          });
        });

        deferred.on = function(event, callback) {
          if (!listeners[event]) {
            listeners[event] = [];
          }
          listeners[event].push(callback);

          return deferred;
        };

        return deferred;
      };
    }
  ]);

}());
