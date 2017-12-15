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

  inboxServices.factory('CreateUser',
    function(
      $http,
      $log,
      $q
    ) {
      'ngInject';


      /**
       * Creates a user from a collection of updates
       *
       * Updates are in the style of the /api/v1/users/{username} service, see
       * its documentation for more details.
       *
       * @param      {Object}  updates        Updates you wish to make
       */
      return function(updates) {
        var url = '/api/v1/users';

        if (!updates.username) {
          return $q.reject('You must provide a username to create a user');
        }

        $log.debug('CreateUser', url, updates);

        return $http({
          method: 'POST',
          url: url,
          data: updates,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
      };
    }
  );

  inboxServices.factory('DeleteUser',
    function(
      $http,
      $log,
      $q
    ) {
      'ngInject';


      /**
       * Deletes a user given a username
       *
       * See DELETE /api/v1/users/{username} documentation for more details
       *
       * @param      {String}  username        User you wish to delete
       */
      return function(username) {
        var url = '/api/v1/users/' + username;

        if (!username) {
          return $q.reject('You must provide a username to delete a user');
        }

        $log.debug('Delete user', url);

        return $http({
          method: 'DELETE',
          url: url,
          headers: {
            'Accept': 'application/json'
          }
        });
      };
    }
  );

}());
