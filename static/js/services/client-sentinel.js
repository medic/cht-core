/*
  For now this is just one changes listener, but needs to be improved
  in order to make it more reliable by adding features currently in
  server-side sentinel such as keeping track of seq numbers.
 */

angular.module('inboxServices').factory('ClientSentinel',
  function(
    Changes,
    DB
  ) {
    'ngInject';
    'use strict';

    return {
      start: function() {
        Changes({
          key: 'wealth-quintiles',
          filter: function(change) {
            return change.doc.fields && Object.keys(change.doc.fields).indexOf('NationalQuintile') !== -1;
          },
          callback: function(change) {
            DB().query('medic-client/contacts_by_parent', { key: change.doc.fields.place_id, include_docs: true })
              .then(function(result) {
                var updatedDocs = result.rows.map(function(row) {
                  row.doc.wealth_quintile_national = change.doc.fields.NationalQuintile;
                  row.doc.wealth_quintile_urban = change.doc.fields.UrbanQuintile;
                  return row.doc;
                });
                return DB().bulkDocs(updatedDocs);
              });
          }
        });
      }
    };
  }
);
