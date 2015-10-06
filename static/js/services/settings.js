var _ = require('underscore'),
    defaults = require('views/lib/app_settings');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('Settings', ['DB', 'Cache',
    function(DB, Cache) {

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

  // TODO this service should be removed if there is a simple way to Promisify
  // the alread-existing service above.
  // TODO if this service is to be kept, it should probably be using `Cache`
  inboxServices.factory('SettingsP',
    ['DB',
    function(DB) {
      return function() {
        return DB.get()
          .get('_design/medic')
          .then(function(ddoc) {
            return _.defaults(ddoc.app_settings, defaults);
          });
      };
    }
  ]);

}()); 
