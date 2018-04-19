(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('UpdateUser',
    function(
      $http,
      $location,
      $log
    ) {
      'ngInject';


      /**
       * Uses the user api to store user updates.
       *
       * Updates are in the style of the /api/v1/users/{username} service, see
       * its documentation for more details.
       *
       * If you pass a username as password this will be used as Basic Auth to
       * the api (required for password updates). Otherwise it will use your
       * existing cookie.
       *
       * @param      {String}  username       The user you wish to update, without org.couchdb.user:
       * @param      {Object}  updates        Updates you wish to make
       * @param      {String}  basicAuthUser  Optional username for Basic Auth
       * @param      {String}  basicAuthPass  Optional password for Basic Auth
       */
      return function(username, updates, basicAuthUser, basicAuthPass) {
        var url = '/api/v1/users/' + username;

        var headers = {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        };

        if (basicAuthUser) {
          headers.Authorization = 'Basic ' + window.btoa(basicAuthUser + ':' + basicAuthPass);
        }

        $log.debug('UpdateUser', url, updates);

        return $http({
          method: 'POST',
          url: url,
          data: updates || {},
          headers: headers
        });
      };
  });

}());
