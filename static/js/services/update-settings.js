(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('UpdateSettings',
    function(
      $cacheFactory,
      $http,
      Location
    ) {
      'ngInject';

      return function(updates, options, callback) {
        if (!callback) {
          callback = options;
          options = {};
        }
        var config = { params: { replace: options.replace } };
        $http.put(Location.path + '/update_settings/medic', updates, config)
          .success(function() {
            // clear cached settings
            $cacheFactory.get('$http')
              .remove(Location.path + '/app_settings/medic');
            callback();
          })
          .error(function(data) {
            callback(new Error(data));
          });
      };
    }
  );
  
}()); 
