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
      return function (updates) {
        //const url = '/api/v1/users';

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

  angular.module('services').factory('CreateMultipleUser',
    function (
      $http,
      $log
    ) {
      'ngInject';

      /**
             * Creates a list of users from a formatted csv file
             *
             * data is the content of the csv file
             *
             * @param      {Object}  data        content of the csv file
             */
      return function (data) {
        //const url = '/api/v1/users';

        $log.debug('CreateMultipleUser', url, data);

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
    }
  );
  
}()
);
