angular.module('inboxServices').factory('MarkRead', function(
  $q,
  DB
) {

  'use strict';
  'ngInject';

  return function(docs) {
    if (!docs || !docs.length) {
      return $q.resolve();
    }
    var metaDocs = docs.map(function(doc) {
      var type = doc.form ? 'report' : 'message';
      var id = [ 'read', type, doc._id ].join(':');
      return { _id: id };
    });
    return DB({ meta: true }).bulkDocs(metaDocs);
  };
});
