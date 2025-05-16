(function () {

  'use strict';

  angular.module('services').factory('GetUser',
    function (
      $http,
      $q
    ) {
      'ngInject';

      /**
       * Gets a user's data by username.
       *
       * @param {string} username the username of the user to retrieve
       */
      const getByUsername = (username) => {
        if (!username) {
          return $q.reject('You must provide a username to retrieve a user');
        }
        const url = `/api/v2/users/${username}`;
        return $http({
          method: 'GET',
          url,
          headers: { 'Accept': 'application/json' }
        }).then(({ data }) => data);
      };

      return {
        getByUsername
      };
    });

}()
);
