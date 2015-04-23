var _ = require('underscore'),
    defaults = require('views/lib/app_settings');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('Settings', ['$http', 'BaseUrlService',
    function($http, BaseUrlService) {
      return function(callback) {
        $http.get(BaseUrlService() + '/app_settings/medic', { cache: true })
          .success(function(res) {
            callback(null, _.defaults(res.settings, defaults));
          })
          .error(function(data) {
            callback(new Error(data));
          });
      };
    }
  ]);

}()); 
