var _ = require('underscore'),
    defaults = require('views/lib/app_settings');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('Settings',
    ['$q', 'Cache', 'DB',
    function($q, Cache, DB) {

      var cache = Cache({
        get: function(callback) {
          return DB.get()
            .get('_design/medic')
            .then(function(ddoc) {
              return _.defaults(ddoc.app_settings, defaults);
            });
        },
        filter: function(change) {
          return change.id === '_design/medic';
        }
      });

      return function() {
        return cache();
      };
    }
  ]);

}());
