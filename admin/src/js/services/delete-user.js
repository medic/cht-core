/**
 * Deletes a user given a username
 *
 * See DELETE /api/v1/users/{username} documentation for more details
 *
 * @param      {String}  username        User you wish to delete
 */
angular.module('services').factory('DeleteUser',
  function(
    $http,
    $log,
    $q
  ) {
    'ngInject';
    'use strict';
    return function(username) {
      const url = '/api/v1/users/' + username;

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
  });
