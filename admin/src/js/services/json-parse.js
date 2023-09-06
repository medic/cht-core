angular.module('inboxServices').factory('JsonParse',
  function(
    $q
  ) {
    'use strict';
    'ngInject';

    return function(json) {
      try {
        return $q.resolve(JSON.parse(json));
      } catch (e) {
        return $q.reject(e);
      }
    };
  });
