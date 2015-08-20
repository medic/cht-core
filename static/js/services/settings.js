var _ = require('underscore'),
    defaults = require('views/lib/app_settings');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('Settings', ['DB',
    function(DB) {
      return function(callback) {
        DB.get()
          .get('medic-settings')
          .then(function(doc) {
            callback(null, _.defaults(doc.app_settings, defaults));
          }).catch(callback);
      };
    }
  ]);

}()); 
