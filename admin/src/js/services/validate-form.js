angular.module('inboxServices').factory('ValidateForm',
  function(
    $http
  ) {
    'ngInject';
    'use strict';

    /**
     * @ngdoc service
     * @name ValidateForm
     * @description Validates the XForm against the API
     * @memberof inboxServices
     * @param {string} xmlForm The XForm string
     * @returns {Promise} if there are no errors
     * @throws {Promise<Error>} with the error message if validations fail
     */
    return xmlForm => {
      const config = {
        headers: { 'Content-Type': 'application/xml' }
      };
      return $http
        .post('/api/v1/forms/validate', xmlForm, config)
        .catch(err => {
          const errorMsg = err.data && err.data.error ? err.data.error : '' + err;
          throw new Error('Error validating form - ' + errorMsg);
        });
    };
  });
