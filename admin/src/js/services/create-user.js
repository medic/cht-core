(function () {

  'use strict';
  const URL = '/api/v2/users';

  angular.module('services').factory('CreateUser',
    function (
      $http,
      $log,
      $q
    ) {
      'ngInject';

      /**
       * Creates a user from a collection of updates
       *
       * Updates are in the style of the /api/v2/users/{username} service, see
       * its documentation for more details.
       *
       * @param      {Object}  updates        Updates you wish to make
       */
      const createSingleUser = (updates) => {
        if (!updates.username) {
          return $q.reject('You must provide a username to create a user');
        }

        $log.debug('CreateSingleUser', URL, updates);

        return $http({
          method: 'POST',
          url: URL,
          data: updates,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
      };

      /**
       * Creates a user from a collection of updates
       *
       * @param      {Object}  data        content of the csv file
       */
      const createMultipleUsers = (data) => {
        $log.debug('CreateMultipleUsers', URL, data);

        return $http({
          method: 'POST',
          url: URL,
          data: data,
          headers: {
            'Content-Type': 'text/csv',
            'Accept': 'application/json'
          }
        });
      };

      return {
        createSingleUser,
        createMultipleUsers
      };
    });
  
}()
);
