angular.module('inboxServices').factory('XmlForm',
  function(
    DB
  ) {

    'use strict';
    'ngInject';

    return function(id, options) {
      options = options || {};
      options.key = id;
      return DB()
        .query('medic-client/forms', options)
        .then(function(result) {
          if (!result.rows.length) {
            throw new Error('No form found for id: ', id);
          }
          if (result.rows.length > 1) {
            throw new Error('Multiple forms found for id: ', id);
          }
          return result.rows[0];
        });
    };
  }
);
