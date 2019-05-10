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

    const getById = internalId => {
      const formId = `form:${internalId}`;
      return DB().get(formId);
    };

    const getByView = internalId => {
      return DB().query('medic-client/doc_by_type', { key: [ 'form' ], include_docs: true })
        .then(result => result.rows.filter(row => row.doc.internalId === internalId))
        .then(rows => {
          if (!rows.length) {
            return $q.reject(new Error(`No form found for internalId "${internalId}"`));
          }
          if (rows.length > 1) {
            return $q.reject(new Error(`Multiple forms found for internalId: "${internalId}"`));
          }
          return rows[0].doc;
        });
    };

    return function(internalId) {
      return getById(internalId)
        .catch(err => {
          if (err.status === 404) {
            // fallback for backwards compatibility
            return getByView(internalId);
          }
          throw err;
        })
        .then(doc => {
          if (!valid(doc)) {
            return $q.reject(new Error(`The form "${internalId}" doesn't have an xform attachment`));
          }
          return doc;
        });
    };
  }
);
