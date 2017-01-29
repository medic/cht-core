var _ = require('underscore');

/*
 * Get all enabled languages
 */
angular.module('inboxServices').factory('Languages',
  function(
    DB
  ) {
    'use strict';
    'ngInject';
    return function() {
      return DB()
        .query('medic-client/doc_by_type', { key: [ 'translations', true ] })
        .then(function(result) {
          return _.pluck(result.rows, 'value');
        });
    };
  }
);
