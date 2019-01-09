/**
 * A simple wrapper of $translate which allows for unit test mocking
 */
angular.module('inboxServices').service('Translate',
  function(
    $log,
    $translate
  ) {

    'use strict';
    'ngInject';

    var fieldIsRequired = function(fieldKey) {
      return $translate(fieldKey)
        .then(function(field) {
          return $translate('field is required', { field: field });
        });
    };

    return {
      fieldIsRequired: fieldIsRequired
    };    
  }
);
