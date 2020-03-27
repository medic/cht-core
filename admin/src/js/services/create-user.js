angular.module('services').factory('CreateUser',
  function(
    $http,
    $log,
    $q
  ) {
    'ngInject';
    'use strict';

    /**
     * Creates a user from a collection of updates
     *
     * Updates are in the style of the /api/v1/users/{username} service, see
     * its documentation for more details.
     *
     * @param      {Object}  updates        Updates you wish to make
     */
    return function(updates) {
      const url = '/api/v1/users';

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
