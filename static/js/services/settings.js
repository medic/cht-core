var _ = require('underscore'),
    defaults = require('views/lib/app_settings');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('Settings', ['pouchDB',
    function(pouchDB) {
      return function(callback) {
        pouchDB('medic')
          .get('_design/medic')
          .then(function(doc) {
            callback(null, _.defaults(doc.app_settings, defaults));
          }).catch(function(err) {
            callback(new Error(err));
          });
      };
    }
  ]);

}()); 
