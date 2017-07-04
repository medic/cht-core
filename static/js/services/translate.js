/**
 * A simple wrapper of $translate which allows for unit test mocking
 */
angular.module('inboxServices').service('Translate',
  function(
    $translate
  ) {

    'use strict';
    'ngInject';

    return function(translationId, interpolateParams) {
      return $translate(translationId, interpolateParams);
    };
  }
);
