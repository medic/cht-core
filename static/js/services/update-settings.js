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

      return function(updates, options) {
        options = options || {};
        var config = { params: { replace: options.replace } };
        return $http.put(Location.path + '/update_settings/medic', updates, config)
          .then(function() {
            // clear cached settings
            $cacheFactory.get('$http')
              .remove(Location.path + '/app_settings/medic');
          });
      };
    }
  );
  
}()); 
