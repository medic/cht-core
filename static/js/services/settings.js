var _ = require('underscore'),
    defaults = require('views/lib/app_settings');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('Settings', ['$q', 'DB', 'Cache',
    function($q, DB, Cache) {

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

      return function(callback) {
        cache(callback);
      };

    }
  ]);

  inboxServices.factory('SettingsP',
    ['Settings',
    function(Settings) {
      return function() {
        return $q(function(resolve, reject) {
          Settings(function(err, settings) {
            if(err) {
              reject(err);
            } else {
              resolve(settings);
            }
          });
        });
      };
    }
  ]);

}()); 
