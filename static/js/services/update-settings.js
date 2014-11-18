(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('UpdateSettings', ['$resource', 'BaseUrlService',
    function($resource, BaseUrlService) {
      return function(updates, callback) {
        $resource(BaseUrlService() + '/update_settings/medic', {}, {
          update: {
            method: 'PUT',
            isArray: false
          }
        }).update(
          updates,
          function() {
            callback();
          },
          callback
        );
      };
    }
  ]);
  
}()); 
