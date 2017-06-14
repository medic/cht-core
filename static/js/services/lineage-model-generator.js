/**
 * Hydrates the given doc by uuid and creates a model which holds
 * the doc and associated contacts. eg:
 * {
 *   _id: <doc uuid>,
 *   doc: <doc>,
 *   contact: <doc reporter>, // only relevant for reports
 *   lineage: <array of parents>
 * }
 */
angular.module('inboxServices').factory('LineageModelGenerator',
  function(
    DB
  ) {
    'ngInject';
    'use strict';

    var get = function(id) {
      return DB()
        .query('medic-client/docs_by_id_lineage', {
          startkey: [ id ],
          endkey: [ id, {} ],
          include_docs: true
        })
        .then(function(result) {
          return result.rows.map(function(row) {
            return row && row.doc;
          });
        });
    };

    return {
      contact: function(id) {
        return get(id).then(function(docs) {
          // the first row is the contact
          var doc = docs.shift();
          return {
            _id: id,
            doc: doc,
            lineage: docs // everything else is the lineage
          };
        });
      },
      report: function(id) {
        return get(id).then(function(docs) {
          // the first row is the report
          var doc = docs.shift();
          // the second row is the report's contact
          var contact = docs.shift();
          return {
            _id: id,
            doc: doc,
            contact: contact,
            lineage: docs // everything else is the lineage
          };
        });
      }
    };

  }
);
