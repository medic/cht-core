angular.module('inboxServices').factory('XmlForm',
  function(
    DB
  ) {

    'use strict';
    'ngInject';

    return function(internalId, options) {
      options = options || {};
      options.key = internalId;
      return DB()
        .query('medic-client/forms', options)
        .then(function(result) {
          if (!result.rows.length) {
            throw new Error('No form found for internalId: ' + internalId);
          }
          if (result.rows.length > 1) {
            throw new Error('Multiple forms found for internalId: ' + internalId);
          }
          return result.rows[0];
        });
    };
  }
);
