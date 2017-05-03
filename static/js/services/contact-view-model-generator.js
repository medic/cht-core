angular.module('inboxServices').factory('ContactViewModelGenerator',
  function(
    DB
  ) {
    'ngInject';
    'use strict';

    return function(id) {
      var options = {
        startkey: [ id, 0 ],
        endkey: [ id, 100 ], // TODO what's the max depth?
        include_docs: true
      };
      return DB()
        .query('medic-client/docs_by_id_lineage', options)
        .then(function(result) {
          console.log('result', result);
          var contactRow = result.rows.shift();
          if (!contactRow) {
            return;
          }
          var contact = contactRow && contactRow.doc;
          var lineage = result.rows.map(function(row) {
            return row.doc;
          });
          return {
            _id: contact._id,
            doc: contact,
            lineage: lineage
          };
        });
    };
  }
);
