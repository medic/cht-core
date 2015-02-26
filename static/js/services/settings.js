var _ = require('underscore'),
    defaults = require('views/lib/app_settings');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('Settings', ['$resource', 'BaseUrlService',
    function($resource, BaseUrlService) {
      return function(callback) {
        $resource(BaseUrlService() + '/app_settings/medic', {}, {
          query: {
            method: 'GET',
            isArray: false,
            cache: true
          }
        }).query(
          function(res) {
            callback(null, _.defaults(res.settings, defaults));
          },
          callback
        );
      };
    }
  ]);
  
}()); 
