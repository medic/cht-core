var _ = require('underscore'),
    defaults = require('views/lib/app_settings');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('Settings', ['HttpWrapper', 'BaseUrlService',
    function(HttpWrapper, BaseUrlService) {
      return function(options, callback) {
        if (!callback) {
          callback = options;
          options = {};
        }
        options = options || {};
        options.cache = options.cache || true;
        HttpWrapper.get(BaseUrlService() + '/app_settings/medic', options)
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
