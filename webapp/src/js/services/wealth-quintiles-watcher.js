/*
  This eventually needs to be improved by adding features currently in
  server-side sentinel such as keeping track of seq numbers (possibly
  becoming a client-side sentinel style service).
 */

angular.module('inboxServices').factory('WealthQuintilesWatcher',
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
            return change.doc &&
                   change.doc.fields &&
                   Object.keys(change.doc.fields).indexOf('NationalQuintile') !== -1;
          },
          callback: function(change) {
            DB().query('medic-client/contacts_by_parent', {
              startkey: [change.doc.fields.place_id],
              endkey: [change.doc.fields.place_id, {}],
              include_docs: true
            }).then(function(result) {
              const updatedDocs = result.rows.map(function(row) {
                if (row.doc.wealth_quintile_national !== change.doc.fields.NationalQuintile ||
                    row.doc.wealth_quintile_urban !== change.doc.fields.UrbanQuintile) {

                  row.doc.wealth_quintile_national = change.doc.fields.NationalQuintile;
                  row.doc.wealth_quintile_urban = change.doc.fields.UrbanQuintile;
                  return row.doc;
                }
              }).filter(function(doc) {
                return doc;
              });
              return DB().bulkDocs(updatedDocs);
            });
          }
        });
      }
    };
  }
);
