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

    return function(translationId, interpolateParams) {
      return $translate(translationId, interpolateParams)
        .catch(function() {
          $log.warn('Translation service could not find a translation for ' + translationId);
          return translationId;
        });
    };
  }
);
