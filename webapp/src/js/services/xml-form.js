angular.module('inboxServices').factory('XmlForm',
  function(
    DB
  ) {

    'use strict';
    'ngInject';

    return function(internalId, fields) {
      const options = {selector: {type: 'form', '_attachments.xml': {$exists: true}, key: internalId}};
      if (fields) {
        options.fields = fields;
      }
      return DB()
        .find(options)
        .then(function(result) {
          if (!result.rows.length) {
            throw new Error('No form found for internalId: ' + internalId);
          }
          if (result.rows.length > 1) {
            throw new Error('Multiple forms found for internalId: ' + internalId);
          }
          return result.docs[0];
        });
    };
  }
);
