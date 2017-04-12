angular.module('inboxServices').factory('ReportViewModelGenerator',
  function(
    DB,
    FormatDataRecord
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
        .query('medic-client/reports_by_id_lineage', options)
        .then(function(result) {
          console.log('result', result);
          var reportRow = result.rows.shift();
          if (!reportRow) {
            return;
          }
          var contacts = result.rows.map(function(row) {
            return row.doc;
          });
          return {
            doc: reportRow.doc,
            contacts: contacts
          };
        })
        .then(function(model) {
          // TODO inline FormatDataRecord and the sms_utils call
          //      here - it's antiquated
          // TODO clone model.doc so it's not modified!
          return FormatDataRecord(model.doc).then(function(formatted) {
            model.formatted = formatted;
            return model;
          });
        });
    };
  }
);
