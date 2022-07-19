(function () {

  'use strict';
  const url = '/api/v2/users';

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
       * Updates are in the style of the /api/v1/users/{username} service, see
       * its documentation for more details.
       *
       * @param      {Object}  updates        Updates you wish to make
       */
      const createSingleUser = (updates) => {
        if (!updates.username) {
          return $q.reject('You must provide a username to create a user');
        }

        $log.debug('CreateSingleUser', url, updates);

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

      /**
       * Creates a user from a collection of updates
       * 
       * data is the content of the csv file
       *
       * @param      {Object}  data        content of the csv file
       */
      const createMultipleUsers = (data) => {
        $log.debug('CreateMultipleUsers', url, data);

        return $http({
          method: 'POST',
          url: url,
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
    }
  );
  
}()
);
