(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('UpdateSettings', [
    '$http', '$cacheFactory', 'BaseUrlService',
    function($http, $cacheFactory, BaseUrlService) {
      return function(updates, options, callback) {
        if (!callback) {
          callback = options;
          options = {};
        }
        var config = { params: { replace: options.replace } };
        $http.put(BaseUrlService() + '/update_settings/medic', updates, config)
          .success(function() {
            // clear cached settings
            $cacheFactory.get('$http')
              .remove(BaseUrlService() + '/app_settings/medic');
            callback();
          })
          .error(function(data) {
            callback(new Error(data));
          });
      };
    }
  ]);
  
}()); 
