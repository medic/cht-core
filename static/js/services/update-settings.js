(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('UpdateSettings', [
    'HttpWrapper', '$cacheFactory', 'BaseUrlService',
    function(HttpWrapper, $cacheFactory, BaseUrlService) {
      return function(updates, callback) {
        HttpWrapper.put(BaseUrlService() + '/update_settings/medic', updates)
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
