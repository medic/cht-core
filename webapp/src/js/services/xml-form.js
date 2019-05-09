angular.module('inboxServices').factory('XmlForm',
  function(
    $q,
    DB
  ) {

    'use strict';
    'ngInject';

    // TODO expose this so XmlForms can use it??
    const valid = doc => {
      return Object.keys(doc._attachments || {})
             .some(name => name === 'xml' || name.endsWith('.xml'));
    };

    return function(internalId) {
      const formId = `form:${internalId}`;
      return DB().get(formId)
        .then(doc => {
          if (!valid(doc)) {
            return $q.reject(new Error(`The form doc with "${formId}" doesn't have an xform attachment`));
          }
          console.log(doc);
          return doc;
        });

      // const options = {
      //   include_docs: true,
      //   key: internalId
      // };
      // return DB()
      //   .query('medic-client/forms', options)
      //   .then(function(result) {
      //     if (!result.rows.length) {
      //       throw new Error('No form found for internalId: ' + internalId);
      //     }
      //     if (result.rows.length > 1) {
      //       throw new Error('Multiple forms found for internalId: ' + internalId);
      //     }
      //     return result.rows[0].doc;
      //   });
    };
  }
);
