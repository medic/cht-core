var _ = require('underscore'),
    defaults = require('views/lib/app_settings');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('Settings', ['SettingsP',
    function(SettingsP) {

      return function(callback) {
        SettingsP()
          .on('change', function(settings) {
            callback(null, settings);
          })
          .on('error', callback);
      };

    }
  ]);

  inboxServices.factory('SettingsP',
    ['$q', 'Cache', 'DB',
    function($q, Cache, DB) {

      var listeners = {};

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
        },
      });

      return function() {
        var self = $q(function(resolve, reject) {
          cache(function(err, settings) {
            if (err) {
              return reject(err);
            }
            resolve(settings);
          });
        });

        self.then(function(settings) {
          self.emit('change', settings);
        });

        self.catch(function(err) {
          self.emit('error', err);
        });

        self.emit = function(event, data) {
          _.each(listeners[event] || [], function(callback) {
            try {
              callback(data);
            } catch(e) {
              console.error('Error triggering listener callback.', event, data, callback);
            }
          });

          return self;
        };

        self.on = function(event, callback) {
          if (!listeners[event]) {
            listeners[event] = [];
          }
          listeners[event].push(callback);

          return self;
        };

        return self;
      };
    }
  ]);

}());
