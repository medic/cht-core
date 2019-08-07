angular.module('inboxServices').factory('XmlForm',
  function(
    Repository
  ) {

    'use strict';
    'ngInject';

    return function(internalId) {
      return Repository.forms(internalId)
        .then(function(forms) {
          if (!forms.length) {
            throw new Error('No form found for internalId: ' + internalId);
          }
          if (forms.length > 1) {
            throw new Error('Multiple forms found for internalId: ' + internalId);
          }
          return forms[0];
        });
    };
  }
);
