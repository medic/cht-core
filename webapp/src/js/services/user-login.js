(function () {

  'use strict';

  angular.module('inboxServices').factory('UserLogin',
    function(
      $http,
      $log,
      Location
    ) {
      'ngInject';


      /**
       * Calls back-end Login service. 
       *
       * @param {Object} data Data needed for login.
       */
      return function(data) {
        const url = '/' + Location.dbName + '/login';
        
        const headers = {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        };

        $log.debug('UserLogin', url, data);

        return $http({
          method: 'POST',
          url: url,
          data: data || {},
          headers: headers
        });
      };
    });

}());
