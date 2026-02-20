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
        .allDocs({ start_key: 'messages-', end_key: 'messages-\ufff0', include_docs: true })
        .then(function(result) {
          return result.rows.map(row => ({ code: row.doc.code, name: row.doc.name }));
        });
    };
  });
