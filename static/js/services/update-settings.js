(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('UpdateSettings', [
    '$resource', '$cacheFactory', 'BaseUrlService',
    function($resource, $cacheFactory, BaseUrlService) {
      return function(updates, callback) {
        $resource(BaseUrlService() + '/update_settings/medic', {}, {
          update: {
            method: 'PUT',
            isArray: false
          }
        }).update(
          updates,
          function() {
            // clear cached settings
            $cacheFactory.get('$http')
              .remove(BaseUrlService() + '/app_settings/medic');
            callback();
          },
          callback
        );
      };
    }
  ]);
  
}()); 
